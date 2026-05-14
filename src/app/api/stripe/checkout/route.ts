import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { getPriceId } from '@/lib/stripe/plans';
import type { PlanId } from '@/lib/stripe/plans';

export async function POST(request: NextRequest) {
  console.log('[stripe/checkout] POST called at', new Date().toISOString());
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[stripe/checkout] Unauthorized — no user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[stripe/checkout] User:', user.id);

    const body = await request.json().catch(() => ({}));
    const planId: PlanId = body.planId ?? 'pro';

    if (planId !== 'pro' && planId !== 'unlimited') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = getPriceId(planId);
    if (!priceId) {
      console.error(`[stripe/checkout] No price ID configured for plan: ${planId}`);
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

    // Create or retrieve the Stripe customer
    let customerId = profile.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email as string,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (updateError) {
        console.error('[stripe/checkout] Failed to persist customer ID:', updateError.message);
      }
    }

    console.log(`[stripe/checkout] Creating session for plan: ${planId}, price: ${priceId}`);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dailybriefmail.com';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?upgraded=true`,
      cancel_url: `${siteUrl}/dashboard/upgrade`,
      customer_email: !customerId ? (user.email ?? undefined) : undefined,
      metadata: { user_id: user.id, plan_id: planId },
    });

    if (!session.url) {
      console.error('[stripe/checkout] Session created but no URL returned. Session ID:', session.id);
      return NextResponse.json(
        { error: 'No checkout URL returned from Stripe' },
        { status: 500 }
      );
    }

    console.log('[stripe/checkout] Session created. ID:', session.id, '| URL domain:', new URL(session.url).hostname);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
