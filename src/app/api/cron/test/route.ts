export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runPipeline } from '@/lib/email/pipeline';
import type { ModuleRow } from '@/types';

// CRON_SECRET-gated diagnostic endpoint.
//
// Query params:
//   ?userId=<uuid>   target a specific user (otherwise picks first eligible)
//   ?email=<email>   target by account email
//   ?to=<email>      override the recipient address (sandbox testing)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get('userId');
  const targetEmail = url.searchParams.get('email');
  const overrideRecipient = url.searchParams.get('to');

  const supabase = createAdminClient();

  // If targeting a specific user, fetch just that one; otherwise grab a small
  // batch of active users and pick the first with at least one enabled module.
  let query = supabase
    .from('profiles')
    .select('id, email, full_name, email_theme, email_verbosity, delivery_email, timezone, send_time, subscription_status')
    .eq('is_active', true);

  if (targetUserId) {
    query = query.eq('id', targetUserId).limit(1);
  } else if (targetEmail) {
    query = query.eq('email', targetEmail).limit(1);
  } else {
    query = query.limit(5);
  }

  const { data: users, error: userError } = await query;

  if (userError || !users || users.length === 0) {
    return NextResponse.json({ error: 'No matching users found', detail: userError }, { status: 404 });
  }

  // Find first user that has at least one enabled module
  const { data: allModules } = await supabase
    .from('modules')
    .select('user_id, module_type')
    .eq('is_enabled', true)
    .in('user_id', users.map((u) => u.id));

  const modulesByUser = (allModules ?? []).reduce<Record<string, string[]>>((acc, m: Pick<ModuleRow, 'user_id' | 'module_type'>) => {
    acc[m.user_id] = acc[m.user_id] ?? [];
    acc[m.user_id].push(m.module_type);
    return acc;
  }, {});

  const user = users.find((u) => (modulesByUser[u.id]?.length ?? 0) > 0);

  if (!user) {
    return NextResponse.json({
      error: 'Target user has no enabled modules. Add at least one before firing a test send.',
    }, { status: 400 });
  }

  // Recipient override: route the send to a sandbox address (e.g. natebowers05@gmail.com)
  // without touching the user's saved delivery_email. We swap delivery_email
  // in-memory only; runPipeline reads from the passed object.
  const userForPipeline = overrideRecipient
    ? { ...user, delivery_email: overrideRecipient }
    : user;

  console.log(`[CronTest] Firing pipeline for ${user.email} → ${overrideRecipient ?? user.delivery_email ?? user.email}`);

  const result = await runPipeline(userForPipeline);

  return NextResponse.json({
    user: user.email,
    sentTo: overrideRecipient ?? user.delivery_email ?? user.email,
    modulesFound: modulesByUser[user.id]?.length ?? 0,
    modules: modulesByUser[user.id],
    result,
  });
}
