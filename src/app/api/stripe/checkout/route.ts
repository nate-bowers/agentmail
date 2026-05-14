import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { PLANS } from '@/lib/stripe/products';

export async function POST() {
  console.log('[stripe/checkout] POST called at', new Date().toISOString());
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[stripe/checkout] Unauthorized — no user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[stripe/checkout] User:', user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Derive origin from the incoming request headers (works in both dev and prod)
    const headersList = await headers();
    const host = headersList.get('host') ?? 'localhost:3000';
    const proto = headersList.get('x-forwarded-proto') ?? 'http';
    const origin = `${proto}://${host}`;

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
        // Non-fatal — the checkout session will still work
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PLANS.pro.priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/dashboard/upgrade`,
    });

    if (!session.url) {
      console.error('[stripe/checkout] Session created but no URL returned. Session ID:', session.id);
      return NextResponse.json(
        { error: 'Stripe did not return a checkout URL' },
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
