// Triggered daily by Vercel Cron (see vercel.json).
// Vercel passes Authorization: Bearer <CRON_SECRET> automatically.
//
// In-memory lock prevents overlapping runs within the same serverless
// instance. The "already sent in the last hour" DB check acts as the
// authoritative deduplication guard across instances.

import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
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

type CronUser = Pick<Profile, 'id' | 'email' | 'full_name' | 'timezone' | 'send_time' | 'email_theme' | 'email_verbosity' | 'delivery_email'>;

export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
  const results: PromiseSettledResult<{ success: boolean; error?: string; stage?: string }>[] = [];

  try {
    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, timezone, send_time, email_theme, email_verbosity, delivery_email')
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
      // TODO (Pro plan): uncomment isSendTime to respect per-user send_time + timezone.
      // On Hobby the cron only runs once daily, so this filter would silently drop most users.
      // The cron is fixed at 08:00 ET for beta. send_time is still saved to the DB and shown
      // in the UI — re-enabling this one line is all that's needed when upgrading.
      // if (!isSendTime(user.send_time, user.timezone)) continue;

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
    return NextResponse.json({ error: 'Cron job failed', detail: String(err) }, { status: 500 });
  } finally {
    isRunning = false;
  }

  const succeeded = results.filter(
    (r) => r.status === 'fulfilled' && r.value?.success
  ).length;
  const failed = results.length - succeeded;

  console.log('[Cron] Completed:', { attempted: results.length, succeeded, failed });

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
