import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { buildSearchInstructions } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import { prepareBriefBeforeClaude, applyWeatherErrorSection } from '@/lib/email/briefPrep';
import { getBusinessMailingAddress } from '@/lib/email/compliance';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import type { ModuleRow, Profile } from '@/types';

export const maxDuration = 60;

const DAILY_LIMIT = 3;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const themeOverride = body?.theme as string | undefined;

    const [{ data: profile }, { data: modules }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('modules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_enabled', true)
        .order('display_order', { ascending: true }),
    ]);

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const p = profile as Profile;
    const enabledModules = (modules ?? []) as ModuleRow[];

    if (enabledModules.length === 0) {
      return NextResponse.json({ error: 'no_modules' }, { status: 400 });
    }

    // Check and reset daily counter
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const isNewDay = p.preview_generations_date !== todayStr;
    const currentCount = isNewDay ? 0 : (p.preview_generations_today ?? 0);

    if (currentCount >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: 'limit_reached', remaining: 0, limit: DAILY_LIMIT },
        { status: 429 }
      );
    }

    // Generate
    const emailTheme = themeOverride ?? p.email_theme ?? 'light';
    const moduleInstructions = buildSearchInstructions(enabledModules);
    const prep = await prepareBriefBeforeClaude(moduleInstructions, user.id);
    const generated = await generateDailyBrief(
      {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        email_theme: emailTheme,
        email_verbosity: p.email_verbosity,
      },
      prep.claudeInstructions,
      prep.prefetchedData,
    );
    generated.sections = applyWeatherErrorSection(generated.sections, prep);

    const dateLabel = format(new Date(), 'EEEE, MMMM d, yyyy');
    console.log('[generate-preview] Rendering HTML...');
    let html: string;
    try {
      html = await render(
        DailyBriefEmail({
          userName: p.full_name ?? p.email,
          date: dateLabel,
          intro: generated.intro || undefined,
          sections: generated.sections,
          unsubscribeToken: 'preview',
          theme: emailTheme,
          mailingAddress: getBusinessMailingAddress(),
        })
      );
    } catch (renderErr) {
      console.error('[generate-preview] render() failed:', renderErr);
      throw renderErr;
    }
    console.log(`[generate-preview] HTML rendered, length: ${html.length}`);

    // Increment counter (use admin client to avoid RLS issues)
    const newCount = currentCount + 1;
    await adminClient
      .from('profiles')
      .update({
        preview_generations_today: newCount,
        preview_generations_date: todayStr,
      })
      .eq('id', user.id);

    const moduleStatus: Record<string, 'success' | 'error'> = {};
    for (const section of generated.sections) {
      moduleStatus[section.type] = (section.data as { error?: boolean })?.error ? 'error' : 'success';
    }

    return NextResponse.json({
      html,
      intro: generated.intro,
      sections: generated.sections,
      outputTokens: generated.tokensUsed,
      totalTokens: generated.tokensUsed,
      generatedAt: new Date().toISOString(),
      moduleStatus,
      modulesIncluded: enabledModules.map((m) => m.module_type),
      remaining: DAILY_LIMIT - newCount,
      limit: DAILY_LIMIT,
    });
  } catch (err) {
    console.error('[POST /api/email/generate-preview]', err);
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    );
  }
}
