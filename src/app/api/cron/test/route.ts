export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { createAdminClient } from '@/lib/supabase/admin';
import { runPipeline } from '@/lib/email/pipeline';
import { buildSearchInstructions } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import { prepareBriefBeforeClaude, applyWeatherErrorSection } from '@/lib/email/briefPrep';
import { generateUnsubscribeToken } from '@/lib/unsubscribe';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
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
  const dump = url.searchParams.get('dump'); // 'html' or 'size' returns rendered HTML without sending

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

  // Dump mode: render the brief but skip sending. Used to inspect the exact
  // HTML Gmail would receive (size, structure) without burning a real send.
  if (dump === 'html' || dump === 'size') {
    const { data: modules } = await supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    const moduleInstructions = buildSearchInstructions((modules ?? []) as ModuleRow[]);
    const prep = await prepareBriefBeforeClaude(moduleInstructions, user.id);
    const generated = await generateDailyBrief(
      { id: user.id, email: user.email, full_name: user.full_name, email_theme: user.email_theme, email_verbosity: user.email_verbosity },
      prep.claudeInstructions,
      prep.prefetchedData,
    );
    generated.sections = applyWeatherErrorSection(generated.sections, prep);

    const zonedNow = toZonedTime(new Date(), user.timezone || 'UTC');
    const dateLabel = format(zonedNow, 'EEEE, MMMM d, yyyy');
    const html = await render(
      DailyBriefEmail({
        userName: user.full_name ?? user.email,
        date: dateLabel,
        intro: generated.intro || undefined,
        sections: generated.sections,
        unsubscribeToken: generateUnsubscribeToken(user.id),
        theme: user.email_theme ?? 'light',
        showUpgradeCta: !user.subscription_status || user.subscription_status === 'free',
      })
    );

    if (dump === 'size') {
      const perSection = generated.sections.map((s) => ({
        type: s.type,
        dataChars: JSON.stringify(s.data).length,
      }));
      return NextResponse.json({
        user: user.email,
        totalHtmlBytes: html.length,
        gmailClipThreshold: 102400,
        clippedByGmail: html.length > 102400,
        sectionCount: generated.sections.length,
        perSection,
      });
    }
    return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  console.log(`[CronTest] Firing pipeline for ${user.email} → ${overrideRecipient ?? user.delivery_email ?? user.email}`);

  // Stamp test sends with a unique time tag so Gmail does not thread/fold
  // them with each other or with the real daily brief on the same date.
  const stamp = new Date().toTimeString().slice(0, 5).replace(':', '');
  const result = await runPipeline(userForPipeline, { subjectSuffix: `(test ${stamp})` });

  return NextResponse.json({
    user: user.email,
    sentTo: overrideRecipient ?? user.delivery_email ?? user.email,
    modulesFound: modulesByUser[user.id]?.length ?? 0,
    modules: modulesByUser[user.id],
    result,
  });
}
