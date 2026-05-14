import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { adminClient } from '@/lib/supabase/admin';
import type { PlanId } from '@/lib/stripe/plans';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let sessionId: string | undefined;
  try {
    const body = await request.json();
    sessionId = body.sessionId;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'No session ID provided' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('[ConfirmUpgrade] Session:', session.id);
    console.log('[ConfirmUpgrade] Status:', session.status);
    console.log('[ConfirmUpgrade] Payment:', session.payment_status);
    console.log('[ConfirmUpgrade] Metadata:', session.metadata);

    if (session.metadata?.user_id !== user.id) {
      console.error('[ConfirmUpgrade] User ID mismatch');
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return NextResponse.json({
        error: 'Payment not completed',
        sessionStatus: session.status,
        paymentStatus: session.payment_status,
      }, { status: 400 });
    }

    const planId = (session.metadata?.plan_id ?? 'pro') as PlanId;
    const customerId = session.customer as string;

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        subscription_status: planId,
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[ConfirmUpgrade] DB update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    console.log('[ConfirmUpgrade] Successfully set', user.id, 'to', planId);
    return NextResponse.json({ success: true, plan: planId });
  } catch (err: unknown) {
    console.error('[ConfirmUpgrade] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
