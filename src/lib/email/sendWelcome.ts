// Server-side helper for the one-time signup welcome email.
//
// Used by:
//   - src/app/auth/callback/route.ts (OAuth signups, where the callback
//     route can call this inline before returning the redirect)
//   - src/app/api/welcome-email/route.ts (password-signup branch in
//     AuthForm.handleSubmit fetches that route once the session exists)
//
// Idempotent: checks profiles.welcome_email_sent and bails out if true.
// Uses an admin-client CAS update to claim the send slot so a concurrent
// retry cannot double-fire.

import { render } from '@react-email/render';
import { Resend } from 'resend';
import { adminClient } from '@/lib/supabase/admin';
import WelcomeEmail from '@/components/email/WelcomeEmail';
import { generateUnsubscribeToken } from '@/lib/unsubscribe';
import { buildUnsubscribeHeaders, getBusinessMailingAddress } from '@/lib/email/compliance';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface SendWelcomeResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendWelcomeEmail(userId: string): Promise<SendWelcomeResult> {
  try {
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, email_theme, delivery_email, welcome_email_sent')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return { sent: false, error: 'Profile not found' };
    }

    if (profile.welcome_email_sent) {
      return { sent: false, skipped: true };
    }

    // CAS-style claim: only flip the flag if it is still false. This
    // prevents a double-fire if the OAuth callback and a subsequent
    // explicit /api/welcome-email POST both arrive within milliseconds.
    const { data: claimed, error: claimError } = await adminClient
      .from('profiles')
      .update({ welcome_email_sent: true })
      .eq('id', userId)
      .eq('welcome_email_sent', false)
      .select('id')
      .maybeSingle();

    if (claimError) {
      console.error('[sendWelcomeEmail] CAS claim failed:', claimError.message);
      return { sent: false, error: claimError.message };
    }

    if (!claimed) {
      // Another request beat us to the claim. Treat as skipped.
      return { sent: false, skipped: true };
    }

    const recipientEmail = profile.delivery_email ?? profile.email;
    const unsubscribeToken = generateUnsubscribeToken(userId);
    const mailingAddress = getBusinessMailingAddress();

    const html = await render(
      WelcomeEmail({
        userName: profile.full_name ?? profile.email,
        unsubscribeToken,
        theme: profile.email_theme ?? 'light',
        mailingAddress,
      })
    );

    const { error } = await getResend().emails.send({
      from: 'Daily Brief <brief@dailybriefmail.com>',
      to: recipientEmail,
      subject: 'Welcome to Daily Brief Mail',
      html,
      // CAN-SPAM + Gmail bulk-sender: every outbound email gets these.
      headers: buildUnsubscribeHeaders(userId),
    });

    if (error) {
      console.error('[sendWelcomeEmail] Resend error — reverting welcome_email_sent flag:', error);
      // Resend returned an explicit error (not a thrown exception) — the
      // send definitively did NOT happen. Safe to revert the CAS claim so
      // a subsequent retry can fire. The thrown-exception path below leaves
      // the flag set, since we can't tell whether the send actually went out.
      const { error: revertError } = await adminClient
        .from('profiles')
        .update({ welcome_email_sent: false })
        .eq('id', userId);
      if (revertError) {
        console.error('[sendWelcomeEmail] Failed to revert welcome_email_sent:', revertError.message);
      }
      return { sent: false, error: error.message ?? 'send_failed' };
    }

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sendWelcomeEmail] Unexpected error:', err);
    return { sent: false, error: message };
  }
}
