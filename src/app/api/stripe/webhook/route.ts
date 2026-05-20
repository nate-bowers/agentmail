import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/log';
import type { PlanId } from '@/lib/stripe/plans';

function getPlanIdFromPriceId(priceId: string): PlanId {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  return 'free';
}

export async function POST(request: NextRequest) {
  // Step 1: Read raw body and check signature header
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  log.info('stripe-webhook', 'step 1: received request', {
    bodyLength: body.length,
    signaturePresent: !!signature,
  });

  if (!signature) {
    log.error('stripe-webhook', 'Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Step 2: Check webhook secret is configured
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    log.error('stripe-webhook', 'STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Step 3: Verify signature and parse event
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    log.error('stripe-webhook', 'Signature verification failed', { error: String(err) });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  log.info('stripe-webhook', 'step 2: constructEvent succeeded', { eventType: event.type });

  const admin = createAdminClient();

  // Step 4: Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const planId = (session.metadata?.plan_id as PlanId) ?? 'pro';
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;

      log.info('stripe-webhook', 'step 3: checkout.session.completed', {
        userId,
        planId,
        customerId,
      });

      if (!userId) {
        log.warn('stripe-webhook', 'No user_id in session metadata — skipping (data issue, not server error)');
        return NextResponse.json({ received: true });
      }

      log.info('stripe-webhook', 'step 4: updating profile subscription_status', {
        userId,
        planId,
      });
      const { error } = await admin
        .from('profiles')
        .update({
          subscription_status: planId,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        })
        .eq('id', userId);

      if (error) {
        if (error.code === '23514') {
          log.error('stripe-webhook', 'step 4 FAILED: check constraint violation', {
            constraint: error.details ?? 'unknown',
            rejectedSubscriptionStatus: planId,
          });
        } else {
          log.error('stripe-webhook', 'step 4 FAILED: DB update error', {
            error: error.message,
            code: error.code,
          });
        }
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }

      log.info('stripe-webhook', 'step 5: success — user upgraded', { userId, planId });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const priceId = sub.items.data[0]?.price?.id ?? '';
      const planId = getPlanIdFromPriceId(priceId);

      log.info('stripe-webhook', 'customer.subscription.updated', {
        customerId,
        priceId,
        planId,
      });

      const { error } = await admin
        .from('profiles')
        .update({ subscription_status: planId })
        .eq('stripe_customer_id', customerId);

      if (error) {
        if (error.code === '23514') {
          log.error('stripe-webhook', 'check constraint violation on subscription.updated', {
            constraint: error.details ?? 'unknown',
            rejectedSubscriptionStatus: planId,
          });
        } else {
          log.error('stripe-webhook', 'Failed to update subscription for customer', {
            customerId,
            error: error.message,
          });
        }
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

      log.info('stripe-webhook', 'customer.subscription.deleted', { customerId });

      const { error } = await admin
        .from('profiles')
        .update({ subscription_status: 'free' })
        .eq('stripe_customer_id', customerId);

      if (error) {
        if (error.code === '23514') {
          log.error('stripe-webhook', 'check constraint violation on subscription.deleted', {
            constraint: error.details ?? 'unknown',
            rejectedSubscriptionStatus: 'free',
          });
        } else {
          log.error('stripe-webhook', 'Failed to clear subscription for customer', {
            customerId,
            error: error.message,
          });
        }
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }
      break;
    }

    default:
      log.info('stripe-webhook', 'Unhandled event type', { eventType: event.type });
      break;
  }

  return NextResponse.json({ received: true });
}
