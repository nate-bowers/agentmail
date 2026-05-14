import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlanId } from '@/lib/stripe/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getPlanIdFromPriceId(priceId: string): PlanId {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_UNLIMITED_PRICE_ID) return 'unlimited';
  return 'free';
}

export async function POST(request: NextRequest) {
  // Step 1: Read raw body and check signature header
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  console.log(`[webhook] step 1: raw body length ${body.length}, signature present: ${!!signature}`);

  if (!signature) {
    console.error('[webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Step 2: Check webhook secret is configured
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Step 3: Verify signature and parse event
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  console.log(`[webhook] step 2: constructEvent succeeded, type: ${event.type}`);

  const admin = createAdminClient();

  // Step 4: Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const planId = (session.metadata?.plan_id as PlanId) ?? 'pro';
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;

      console.log(
        `[webhook] step 3: checkout.session.completed, userId=${userId}, planId=${planId}, customerId=${customerId}`
      );

      if (!userId) {
        console.warn('[webhook] No user_id in session metadata — skipping (data issue, not server error)');
        return NextResponse.json({ received: true });
      }

      console.log(
        `[webhook] step 4: update profiles set subscription_status=${planId} where id=${userId}`
      );
      const { error } = await admin
        .from('profiles')
        .update({
          subscription_status: planId,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        })
        .eq('id', userId);

      if (error) {
        if (error.code === '23514') {
          console.error(
            `[webhook] step 4 FAILED: check constraint violation — constraint: ${error.details ?? 'unknown'}, rejected value: subscription_status=${planId}`
          );
        } else {
          console.error('[webhook] step 4 FAILED: DB update error:', error.message, error.code);
        }
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }

      console.log(`[webhook] step 5: success — user ${userId} is now ${planId}`);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const priceId = sub.items.data[0]?.price?.id ?? '';
      const planId = getPlanIdFromPriceId(priceId);

      console.log(
        `[webhook] customer.subscription.updated: customerId=${customerId}, priceId=${priceId}, planId=${planId}`
      );

      const { error } = await admin
        .from('profiles')
        .update({ subscription_status: planId })
        .eq('stripe_customer_id', customerId);

      if (error) {
        if (error.code === '23514') {
          console.error(
            `[webhook] check constraint violation on subscription.updated — constraint: ${error.details ?? 'unknown'}, rejected value: subscription_status=${planId}`
          );
        } else {
          console.error('[webhook] Failed to update subscription for customer', customerId, error.message);
        }
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

      console.log(`[webhook] customer.subscription.deleted: customerId=${customerId}`);

      const { error } = await admin
        .from('profiles')
        .update({ subscription_status: 'free' })
        .eq('stripe_customer_id', customerId);

      if (error) {
        if (error.code === '23514') {
          console.error(
            `[webhook] check constraint violation on subscription.deleted — constraint: ${error.details ?? 'unknown'}, rejected value: subscription_status=free`
          );
        } else {
          console.error('[webhook] Failed to clear subscription for customer', customerId, error.message);
        }
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }
      break;
    }

    default:
      console.log(`[webhook] Unhandled event type: ${event.type}`);
      break;
  }

  return NextResponse.json({ received: true });
}
