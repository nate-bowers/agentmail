import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe/client';
import { getPriceId } from '@/lib/stripe/plans';
import { rateLimit } from '@/lib/security/rateLimit';
import type { PlanId } from '@/lib/stripe/plans';

export async function POST(request: NextRequest) {
  console.log('[Checkout] POST called at', new Date().toISOString());
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Checkout] Unauthorized — no user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[Checkout] User:', user.id);

    const limit = rateLimit(`checkout:${user.id}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(limit.resetAt).toISOString(),
          },
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const planId: PlanId = body.planId ?? 'pro';

    if (planId !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = getPriceId(planId);
    if (!priceId) {
      console.error(`[Checkout] No price ID configured for plan: ${planId}`);
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${planId}` },
        { status: 500 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dailybriefmail.com';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/upgrade`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      },
    };

    // Only pass an existing customer ID if it is valid in the current mode.
    // Never blindly pass whatever is stored in the DB.
    if (profile.stripe_customer_id) {
      try {
        await stripe.customers.retrieve(profile.stripe_customer_id);
        // If retrieve succeeds, the customer exists in this mode
        sessionParams.customer = profile.stripe_customer_id;
        console.log('[Checkout] Using existing customer:', profile.stripe_customer_id);
      } catch (err: unknown) {
        const stripeErr = err as { code?: string };
        if (stripeErr.code === 'resource_missing') {
          // Customer ID is stale (wrong mode or deleted)
          // Clear it from DB so future checkouts are not affected
          console.log('[Checkout] Stale customer ID detected, clearing from DB');
          await createAdminClient()
            .from('profiles')
            .update({ stripe_customer_id: null })
            .eq('id', user.id);
          // Fall through without setting customer — use email instead
          sessionParams.customer_email = user.email ?? undefined;
        } else {
          throw err;
        }
      }
    } else {
      // No customer ID saved — pass email so Stripe creates one
      sessionParams.customer_email = user.email ?? undefined;
    }

    console.log('[Checkout] Creating session with params:', {
      priceId,
      planId,
      hasCustomer: !!sessionParams.customer,
      hasEmail: !!sessionParams.customer_email,
      metadata: sessionParams.metadata,
    });

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      console.error('[Checkout] No URL returned from Stripe');
      return NextResponse.json(
        { error: 'No checkout URL returned from Stripe' },
        { status: 500 }
      );
    }

    console.log('[Checkout] Session created successfully:', session.id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Checkout] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
