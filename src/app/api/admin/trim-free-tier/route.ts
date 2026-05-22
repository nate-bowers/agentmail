// One-shot backfill: trim every free-plan user's modules down to the
// 3-credit budget. Called manually after a bulk downgrade (e.g. when
// preparing for Stripe go-live) so users don't show up to a dashboard
// with 12 credits' worth of modules they shouldn't have.
//
// Gated behind CRON_SECRET. Idempotent — re-running is a safe no-op for
// users who are already within budget.
//
// Trigger with:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//     https://dailybriefmail.com/api/admin/trim-free-tier

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { adminClient } from '@/lib/supabase/admin';
import { trimModulesToFreeTier } from '@/lib/modules/trimToFreeTier';

function verifyCronSecret(provided: string): boolean {
  const expected = process.env.CRON_SECRET ?? '';
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') ?? '';
  if (!verifyCronSecret(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Free users = subscription_status null / 'free'. Anyone Pro is left alone.
  const { data: users, error } = await adminClient
    .from('profiles')
    .select('id, email, subscription_status')
    .or('subscription_status.is.null,subscription_status.eq.free');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let touched = 0;
  let totalDisabled = 0;
  const failures: string[] = [];

  for (const user of users ?? []) {
    try {
      const result = await trimModulesToFreeTier(user.id);
      if (result.disabled > 0) {
        touched++;
        totalDisabled += result.disabled;
      }
    } catch (err) {
      failures.push(`${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    scanned: users?.length ?? 0,
    usersTrimmed: touched,
    modulesDisabled: totalDisabled,
    failures,
  });
}
