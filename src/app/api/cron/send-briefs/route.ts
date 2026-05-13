// Triggered every minute by Vercel Cron (see vercel.json).
// Vercel passes Authorization: Bearer <CRON_SECRET> automatically.
//
// In-memory lock prevents overlapping runs within the same serverless
// instance. Note: in a multi-instance deployment each instance has its
// own lock; the "already sent in the last hour" DB check below acts as
// the authoritative deduplication guard across instances.

import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { adminClient } from '@/lib/supabase/admin';
import { generateDailyBrief } from '@/lib/email/generate';
import { sendDailyBrief } from '@/lib/email/send';
import type { ModuleRow, Profile } from '@/types';

// ─────────────────────────────────────────────────────────────
// In-memory lock (prevents overlapping runs in the same instance)
// ─────────────────────────────────────────────────────────────
let isRunning = false;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function isSendTime(sendTime: string, timezone: string): boolean {
  try {
    const zonedNow = toZonedTime(new Date(), timezone);
    return format(zonedNow, 'HH:mm') === sendTime.slice(0, 5);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Rate limit ──────────────────────────────────────────────
  if (isRunning) {
    console.log('[cron] Already running — skipping this invocation.');
    return NextResponse.json({ skipped: true, reason: 'already_running' });
  }

  isRunning = true;
  const stats = { attempted: 0, succeeded: 0, failed: 0 };

  try {
    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, timezone, send_time')
      .eq('is_active', true);

    if (usersError) throw usersError;
    if (!users?.length) {
      return NextResponse.json({ ...stats, message: 'No active users' });
    }

    // De-duplication window: skip users already sent a brief in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    for (const user of users as Pick<
      Profile,
      'id' | 'email' | 'full_name' | 'timezone' | 'send_time'
    >[]) {
      try {
        // Check send_time in user's timezone
        if (!isSendTime(user.send_time, user.timezone)) {
          continue;
        }

        // Cross-instance dedup: skip if already sent in the last hour
        const { count } = await adminClient
          .from('email_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'success')
          .gte('sent_at', oneHourAgo);

        if (count && count > 0) {
          continue;
        }

        // Fetch enabled modules
        const { data: modules } = await adminClient
          .from('modules')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_enabled', true)
          .order('display_order', { ascending: true });

        if (!modules?.length) {
          continue;
        }

        stats.attempted++;

        // Generate and send
        const brief = await generateDailyBrief(user, modules as ModuleRow[]);
        const result = await sendDailyBrief(user, brief);

        if (result.success) {
          stats.succeeded++;
        } else {
          stats.failed++;
        }
      } catch (err) {
        console.error(`[cron] Failed for user ${user.id}:`, err);
        stats.failed++;
      }
    }
  } catch (err) {
    console.error('[cron] Fatal error:', err);
    return NextResponse.json({ error: 'Cron job failed', ...stats }, { status: 500 });
  } finally {
    isRunning = false;
  }

  console.log('[cron] Completed:', stats);
  return NextResponse.json(stats);
}
