import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/sendWelcome';

// One-time welcome email triggered at signup. Idempotent: re-firing the
// trigger on an already-welcomed profile observes `welcome_email_sent`
// and returns { skipped: true }. AuthForm's password-signup success
// branch hits this once the session exists; the OAuth case fires the
// helper inline from src/app/auth/callback/route.ts instead.
//
// Auth requirement: the caller must have a valid Supabase session
// cookie. The route does not accept a user_id parameter, so a stolen
// session is the only way to trigger a welcome for someone else, and
// in that case the welcome only goes to the legitimate user's email.

export const maxDuration = 15;

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await sendWelcomeEmail(user.id);

    if (result.skipped) return NextResponse.json({ skipped: true });
    if (result.sent) return NextResponse.json({ success: true });
    return NextResponse.json(
      { error: 'send_failed', message: result.error ?? 'Could not send welcome email.' },
      { status: 502 },
    );
  } catch (err) {
    console.error('[POST /api/welcome-email]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
