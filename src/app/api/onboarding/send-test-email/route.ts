import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import WelcomeTestEmail from '@/components/email/WelcomeTestEmail';
import { generateUnsubscribeToken } from '@/lib/unsubscribe';
import { buildUnsubscribeHeaders, getBusinessMailingAddress } from '@/lib/email/compliance';

export const maxDuration = 30;

const HOURLY_LIMIT = 3;

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function startOfCurrentHour(): string {
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  return now.toISOString();
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, timezone, email_theme, onboarding_test_sends_count, onboarding_test_sends_hour')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Hourly rate-limit: reset counter if we are in a new hour
    const currentHour = startOfCurrentHour();
    const sameHour = profile.onboarding_test_sends_hour
      ? new Date(profile.onboarding_test_sends_hour).toISOString() === currentHour
      : false;
    const sentThisHour = sameHour ? (profile.onboarding_test_sends_count ?? 0) : 0;

    if (sentThisHour >= HOURLY_LIMIT) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'You can send at most 3 test emails per hour. Please wait a bit and try again.' },
        { status: 429 }
      );
    }

    // Claim the slot before sending so a concurrent request cannot overshoot
    const { error: claimError } = await adminClient
      .from('profiles')
      .update({
        onboarding_test_sends_count: sentThisHour + 1,
        onboarding_test_sends_hour: currentHour,
        onboarding_test_email_sent: true,
      })
      .eq('id', user.id);

    if (claimError) {
      console.error('[send-test-email] Failed to claim rate-limit slot:', claimError.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const timezone = profile.timezone || 'UTC';
    const zonedNow = toZonedTime(new Date(), timezone);
    const dateLabel = format(zonedNow, 'EEEE, MMMM d, yyyy');

    const unsubscribeToken = generateUnsubscribeToken(user.id);
    const mailingAddress = getBusinessMailingAddress();

    const html = await render(
      WelcomeTestEmail({
        userName: profile.full_name ?? profile.email,
        date: dateLabel,
        theme: profile.email_theme ?? 'light',
        unsubscribeToken,
        mailingAddress,
      })
    );

    const { data, error } = await getResend().emails.send({
      from: 'Daily Brief <brief@dailybriefmail.com>',
      to: profile.email,
      subject: 'Welcome to Daily Brief Mail, please move this to your primary inbox',
      html,
      // CAN-SPAM + Gmail bulk-sender: every outbound email gets these.
      headers: buildUnsubscribeHeaders(user.id),
    });

    if (error) {
      console.error('[send-test-email] Resend error:', error);
      return NextResponse.json({ error: 'send_failed', message: 'Could not send the test email. Please try again in a moment.' }, { status: 502 });
    }

    const remaining = HOURLY_LIMIT - (sentThisHour + 1);
    return NextResponse.json({ success: true, emailId: data?.id, remaining });
  } catch (err) {
    console.error('[POST /api/onboarding/send-test-email]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
