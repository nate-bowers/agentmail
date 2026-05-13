import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const token = typeof (body as Record<string, unknown>)?.token === 'string'
      ? (body as Record<string, unknown>).token as string
      : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const userId = verifyUnsubscribeToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or tampered token' }, { status: 403 });
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_active')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!profile.is_active) {
      return NextResponse.json({ status: 'already_unsubscribed' });
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) {
      console.error('[unsubscribe] DB update failed:', error.message);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    return NextResponse.json({ status: 'unsubscribed' });
  } catch (err) {
    console.error('[POST /api/unsubscribe]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
