// Triggered daily by Vercel Cron (see vercel.json).
// Vercel passes Authorization: Bearer <CRON_SECRET> automatically.
//
// In-memory lock prevents overlapping runs within the same serverless
// instance. The "already sent in the last hour" DB check acts as the
// authoritative deduplication guard across instances.

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Resend } from 'resend';
import { adminClient } from '@/lib/supabase/admin';
import { runPipeline } from '@/lib/email/pipeline';
import { cleanExpiredSearchCache } from '@/lib/email/cache';
import type { Profile } from '@/types';

export const maxDuration = 60;

let isRunning = false;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- re-enable on Pro plan (see TODO below)
function isSendTime(sendTime: string, timezone: string): boolean {
  try {
    const zonedNow = toZonedTime(new Date(), timezone);
    return format(zonedNow, 'HH:mm') === sendTime.slice(0, 5);
  } catch {
    return false;
  }
}

type CronUser = Pick<Profile, 'id' | 'email' | 'full_name' | 'timezone' | 'send_time' | 'email_theme' | 'email_verbosity' | 'delivery_email' | 'subscription_status'>;

type PipelineResult = { success: boolean; error?: string; stage?: string };

type Failure = { userId: string; email: string; stage: string; error: string };

function verifyCronSecret(provided: string): boolean {
  const expected = process.env.CRON_SECRET ?? '';
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Fire-and-forget alert email. Never throws — alerting is a notification,
// not the primary purpose of the cron, so any failure is swallowed and logged.
async function sendFailureAlert(subject: string, body: string): Promise<void> {
  const to = process.env.ALERT_EMAIL;
  if (!to) {
    console.log('[Cron] ALERT_EMAIL unset — skipping failure alert.');
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('[Cron] RESEND_API_KEY unset — cannot send failure alert.');
    return;
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: 'Daily Brief Ops <brief@dailybriefmail.com>',
      to,
      subject,
      text: body,
    });
    if (error) {
      console.error('[Cron] Alert email failed:', error);
    }
  } catch (err) {
    console.error('[Cron] Alert email threw (suppressed):', err);
  }
}

export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') ?? '';
  if (!verifyCronSecret(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  if (isRunning) {
    console.log('[Cron] Already running — skipping this invocation.');
    return NextResponse.json({ skipped: true, reason: 'already_running' });
  }

  isRunning = true;
  console.log('[Cron] Send briefs job started at', new Date().toISOString());

  const matchedUsers: CronUser[] = [];
  const results: PromiseSettledResult<PipelineResult>[] = [];

  try {
    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, timezone, send_time, email_theme, email_verbosity, delivery_email, subscription_status')
      .eq('is_active', true);

    if (usersError) throw usersError;
    if (!users?.length) {
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        attempted: 0, succeeded: 0, failed: 0,
        message: 'No active users',
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    for (const user of users as CronUser[]) {
      // FREE PLAN: override send_time to 07:00 — free users always get email at 7am local.
      // Paid users use their configured send_time. DB value is never modified.
      const isFreePlan = !user.subscription_status || user.subscription_status === 'free';
      const effectiveSendTime = isFreePlan ? '07:00' : user.send_time;

      // TODO (Pro plan): uncomment isSendTime to respect per-user send_time + timezone.
      // On Hobby the cron only runs once daily, so this filter would silently drop most users.
      // The cron is fixed at 08:00 ET for beta. send_time is still saved to the DB and shown
      // in the UI — re-enabling this one line is all that's needed when upgrading.
      // if (!isSendTime(effectiveSendTime, user.timezone)) continue;
      void effectiveSendTime; // referenced above when isSendTime is re-enabled

      const { count } = await adminClient
        .from('email_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'success')
        .gte('sent_at', oneHourAgo);

      if (count && count > 0) continue;

      matchedUsers.push(user);
    }

    const promises = matchedUsers.map((user) => runPipeline(user));
    const settled = await Promise.allSettled(promises);
    results.push(...settled);

    // Clean up expired search cache entries (non-fatal)
    cleanExpiredSearchCache().catch((err) =>
      console.error('[Cron] Search cache cleanup failed (non-fatal):', err)
    );
  } catch (err) {
    console.error('[Cron] Fatal error:', err);
    isRunning = false;
    // Alert on fatal error (no per-user results to report).
    await sendFailureAlert(
      '[Daily Brief Cron] Fatal error',
      `Cron handler threw before any users were processed.\n\nTimestamp: ${new Date().toISOString()}\nError: ${String(err)}\n`,
    );
    return NextResponse.json({ error: 'Cron job failed', detail: String(err) }, { status: 500 });
  } finally {
    isRunning = false;
  }

  // Collect failures (rejected promises + fulfilled-but-success=false).
  const failures: Failure[] = results.flatMap((r, i) => {
    const user = matchedUsers[i];
    if (!user) return [];
    if (r.status === 'rejected') {
      return [{ userId: user.id, email: user.email, stage: 'unknown', error: String(r.reason) }];
    }
    if (!r.value?.success) {
      return [{
        userId: user.id,
        email: user.email,
        stage: r.value?.stage ?? 'unknown',
        error: r.value?.error ?? 'unknown',
      }];
    }
    return [];
  });

  const succeeded = results.length - failures.length;
  const failed = failures.length;

  console.log('[Cron] Completed:', { attempted: results.length, succeeded, failed });

  // One alert per cron run when any user failed.
  if (failures.length > 0) {
    const body = [
      `Daily Brief cron completed with ${failures.length} failure(s) out of ${results.length} user(s).`,
      `Timestamp: ${new Date().toISOString()}`,
      '',
      'Failures:',
      ...failures.map(
        (f) => `  - user_id=${f.userId} email=${f.email} stage=${f.stage}\n    error: ${f.error}`,
      ),
    ].join('\n');
    await sendFailureAlert(
      `[Daily Brief Cron] ${failures.length} failures`,
      body,
    );
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    attempted: results.length,
    succeeded,
    failed,
    details: results.map((r, i) => ({
      user: matchedUsers[i]?.email,
      success: r.status === 'fulfilled' ? r.value?.success : false,
      error: r.status === 'rejected' ? String(r.reason) : r.value?.error,
      stage: r.status === 'fulfilled' ? r.value?.stage : 'unknown',
    })),
  });
}
