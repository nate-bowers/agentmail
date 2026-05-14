import { render } from '@react-email/render';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { adminClient } from '@/lib/supabase/admin';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import { generateUnsubscribeToken } from '@/lib/unsubscribe';
import type { GeneratedSection } from './generate';
import type { Profile } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendResult {
  success: boolean;
  error?: string;
  emailId?: string;
}

export async function sendDailyBrief(
  user: Pick<Profile, 'id' | 'email' | 'full_name' | 'timezone' | 'email_theme' | 'subscription_status'> & { delivery_email?: string | null },
  generated: { intro?: string; sections: GeneratedSection[]; tokensUsed?: number },
): Promise<SendResult> {
  try {
    const { id: userId, email, full_name, timezone, email_theme, delivery_email, subscription_status } = user;
    const recipientEmail = delivery_email ?? email;
    const theme = email_theme ?? 'light';

    const zonedNow = toZonedTime(new Date(), timezone || 'UTC');
    const subject = `Your Brief — ${format(zonedNow, 'EEEE, MMMM d')}`;
    const dateLabel = format(zonedNow, 'EEEE, MMMM d, yyyy');
    const unsubscribeToken = generateUnsubscribeToken(userId);

    const showUpgradeCta = !subscription_status || subscription_status === 'free';

    const renderedHTML = await render(
      DailyBriefEmail({
        userName: full_name ?? email,
        date: dateLabel,
        intro: generated.intro || undefined,
        sections: generated.sections,
        unsubscribeToken,
        theme,
        showUpgradeCta,
      })
    );

    console.log('[Send] Rendered HTML length:', renderedHTML.length);
    if (renderedHTML.length < 500) {
      console.warn('[Send] Rendered HTML seems too short — possible render error');
    }

    const { data, error } = await resend.emails.send({
      from: 'Daily Brief <brief@dailybriefmail.com>',
      to: recipientEmail,
      subject,
      html: renderedHTML,
    });

    if (error) {
      console.error('[Send] Resend error:', error);
      await logEmail(userId, 'failed', error.message, generated);
      return { success: false, error: JSON.stringify(error) };
    }

    console.log('[Send] Email sent successfully. Resend ID:', data?.id);
    await logEmail(userId, 'success', undefined, generated);
    return { success: true, emailId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Send] Unexpected error:', err);
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
    modules_included: generated.sections.map((s) => s.type),
    generation_tokens: generated.tokensUsed ?? null,
  });

  if (logError) {
    console.error('[Send] Failed to write email_log:', logError.message);
  }
}
