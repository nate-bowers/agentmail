import { render } from '@react-email/render';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { adminClient } from '@/lib/supabase/admin';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import { generateUnsubscribeToken } from '@/lib/unsubscribe';
import type { GeneratedBrief } from './generate';
import type { Profile } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildSubject(timezone: string): string {
  const now = toZonedTime(new Date(), timezone);
  return `Your Brief — ${format(now, 'EEEE, MMMM d')}`;
}

function buildDateLabel(timezone: string): string {
  const now = toZonedTime(new Date(), timezone);
  return format(now, 'EEEE, MMMM d, yyyy');
}

export interface SendResult {
  success: boolean;
  error?: string;
}

export async function sendDailyBrief(
  user: Pick<Profile, 'id' | 'email' | 'full_name' | 'timezone'>,
  generatedContent: GeneratedBrief,
  emailTheme = 'light',
  tokenCount = 0
): Promise<SendResult> {
  const { id: userId, email, full_name, timezone } = user;

  const subject = buildSubject(timezone);
  const dateLabel = buildDateLabel(timezone);
  const unsubscribeToken = generateUnsubscribeToken(userId);

  const html = await render(
    DailyBriefEmail({
      userName: full_name ?? email,
      date: dateLabel,
      intro: generatedContent.intro || undefined,
      sections: generatedContent.sections,
      unsubscribeToken,
      theme: emailTheme,
    })
  );

  let sendError: string | undefined;

  try {
    const { error } = await resend.emails.send({
      from: 'Daily Brief <brief@dailybriefmail.com>',
      to: email,
      subject,
      html,
    });

    if (error) sendError = error.message;
  } catch (err: unknown) {
    sendError = err instanceof Error ? err.message : String(err);
  }

  const { error: logError } = await adminClient.from('email_logs').insert({
    user_id: userId,
    status: sendError ? 'failed' : 'success',
    error_message: sendError ?? null,
    modules_included: generatedContent.sections.map((s) => s.type),
    generation_tokens: tokenCount || null,
  });

  if (logError) {
    console.error('[send] Failed to write email_log:', logError.message);
  }

  if (sendError) {
    console.error(`[send] Failed to send brief to ${email}:`, sendError);
    return { success: false, error: sendError };
  }

  console.log(`[send] Brief sent to ${email} — "${subject}"`);
  return { success: true };
}
