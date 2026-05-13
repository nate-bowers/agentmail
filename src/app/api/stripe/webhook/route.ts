// Stripe webhook handler.
//
// The App Router passes the raw Request object, so `request.text()` gives
// us the raw body Stripe needs for signature verification — no bodyParser
// configuration in next.config is required (that setting only applies to
// the legacy Pages Router).

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { adminClient } from '@/lib/supabase/admin';
import type { SubscriptionStatus } from '@/types';

function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':   return 'active';
    case 'past_due': return 'past_due';
    default:         return 'canceled';
  }
}

async function updateProfileByCustomer(
  customerId: string,
  updates: Record<string, unknown>
) {
  const { error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('[webhook] Failed to update profile for customer', customerId, error.message);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.customer) {
          const customerId =
            typeof session.customer === 'string' ? session.customer : session.customer.id;
          await updateProfileByCustomer(customerId, { subscription_status: 'active' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await updateProfileByCustomer(customerId, {
          subscription_status: mapStripeStatus(sub.status),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await updateProfileByCustomer(customerId, { subscription_status: 'canceled' });
        break;
      }

      default:
        // Unhandled event type — safe to ignore
        break;
    }
  } catch (err) {
    console.error('[webhook] Handler error for event', event.type, err);
    // Still return 200 so Stripe doesn't retry — log and investigate separately
  }

  return NextResponse.json({ received: true });
}
