import { render } from '@react-email/render';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { adminClient } from '@/lib/supabase/admin';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import { generateUnsubscribeToken } from '@/lib/unsubscribe';
import { buildUnsubscribeHeaders, getBusinessMailingAddress } from '@/lib/email/compliance';
import { buildContextLine } from '@/lib/email/contextLine';
import { reorderSectionsForDisplay } from '@/lib/email/reorderSections';
import { log } from '@/lib/log';
import type { GeneratedSection } from './generate';
import type { Profile } from '@/types';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface SendResult {
  success: boolean;
  error?: string;
  emailId?: string;
}

export async function sendDailyBrief(
  user: Pick<Profile, 'id' | 'email' | 'full_name' | 'timezone' | 'email_theme' | 'subscription_status'> & { delivery_email?: string | null },
  generated: { intro?: string; sections: GeneratedSection[]; tokensUsed?: number },
  options?: { subjectSuffix?: string },
): Promise<SendResult> {
  try {
    const { id: userId, email, full_name, timezone, email_theme, delivery_email, subscription_status } = user;
    const recipientEmail = delivery_email ?? email;
    const theme = email_theme ?? 'light';

    const zonedNow = toZonedTime(new Date(), timezone || 'UTC');
    // subjectSuffix is used by test/preview routes to break Gmail's same-subject
    // thread folding (otherwise repeated test sends collapse under "Show trimmed content").
    const baseSubject = `Your Brief — ${format(zonedNow, 'EEEE, MMMM d')}`;
    const subject = options?.subjectSuffix ? `${baseSubject} ${options.subjectSuffix}` : baseSubject;
    const dateLabel = format(zonedNow, 'EEEE, MMMM d, yyyy');
    const unsubscribeToken = generateUnsubscribeToken(userId);

    const showUpgradeCta = !subscription_status || subscription_status === 'free';

    const mailingAddress = getBusinessMailingAddress();
    // Lift a rotating distinctive module to the lead position; never repeat
    // for a given user until they cycle through all their distinctive ones.
    const displaySections = reorderSectionsForDisplay(generated.sections, userId);
    const contextLine = buildContextLine(displaySections, timezone || 'UTC');

    const renderedHTML = await render(
      DailyBriefEmail({
        userName: full_name ?? email,
        date: dateLabel,
        intro: generated.intro || undefined,
        sections: displaySections,
        unsubscribeToken,
        theme,
        showUpgradeCta,
        mailingAddress,
        contextLine,
      })
    );

    log.info('send', 'Rendered HTML', { htmlLength: renderedHTML.length });
    if (renderedHTML.length < 500) {
      log.warn('send', 'Rendered HTML seems too short — possible render error', {
        htmlLength: renderedHTML.length,
      });
    }

    const { data, error } = await getResend().emails.send({
      from: 'Daily Brief <brief@dailybriefmail.com>',
      to: recipientEmail,
      subject,
      html: renderedHTML,
      // RFC 8058 + Gmail bulk-sender requirements. Must be present on every outbound email.
      headers: buildUnsubscribeHeaders(userId),
    });

    if (error) {
      log.error('send', 'Resend error', { error: JSON.stringify(error), userId });
      await logEmail(userId, 'failed', error.message, generated);
      return { success: false, error: JSON.stringify(error) };
    }

    log.info('send', 'Email sent successfully', { resendId: data?.id, userId });
    await logEmail(userId, 'success', undefined, generated);
    return { success: true, emailId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('send', 'Unexpected error', { error: String(err) });
    return { success: false, error: message };
  }
}

async function logEmail(
  userId: string,
  status: 'success' | 'failed',
  errorMessage: string | undefined,
  generated: { sections: GeneratedSection[]; tokensUsed?: number },
) {
  const { error: logError } = await adminClient.from('email_logs').insert({
    user_id: userId,
    status,
    error_message: errorMessage ?? null,
    // modules_included is jsonb on purpose: keeps the shape free to evolve
    // (e.g. swap from string[] to {type,version}[] later) without a migration.
    // Postgres accepts a string array into jsonb. If querying inside the
    // array ever becomes load-bearing, prefer a Supabase view over a column
    // type change — see docs/launch-readiness-audit.md section 3.
    modules_included: generated.sections.map((s) => s.type),
    generation_tokens: generated.tokensUsed ?? null,
  });

  if (logError) {
    log.error('send', 'Failed to write email_log', { error: logError.message, userId });
  }
}
