export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runPipeline } from '@/lib/email/pipeline';
import type { ModuleRow } from '@/types';

export async function GET() {
  const supabase = createAdminClient();

  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id, email, full_name, email_theme, email_verbosity, delivery_email, timezone, send_time')
    .eq('is_active', true)
    .limit(5);

  if (userError || !users || users.length === 0) {
    return NextResponse.json({ error: 'No active users found', detail: userError }, { status: 404 });
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
      error: 'No users with modules found. Add at least one module to your dashboard first.',
    }, { status: 400 });
  }

  console.log(`[CronTest] Firing pipeline for user: ${user.email}`);

  const result = await runPipeline(user);

  return NextResponse.json({
    user: user.email,
    modulesFound: modulesByUser[user.id]?.length ?? 0,
    modules: modulesByUser[user.id],
    result,
  });
}
