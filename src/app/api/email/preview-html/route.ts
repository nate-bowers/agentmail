import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { buildSearchInstructions } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import { prepareBriefBeforeClaude, applyWeatherErrorSection, refineNewsInSections, stripErrorAndDuplicateSections } from '@/lib/email/briefPrep';
import { getBusinessMailingAddress } from '@/lib/email/compliance';
import { rateLimit } from '@/lib/security/rateLimit';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import type { ModuleRow, Profile } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 10 previews per hour per user. Each preview burns Claude tokens, so
    // an unauthenticated abuse path here would be very expensive.
    const limit = await rateLimit(`preview_html:${user.id}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many previews. Try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(limit.resetAt).toISOString(),
          },
        },
      );
    }

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

    const emailTheme = themeOverride ?? p.email_theme ?? 'light';
    const moduleInstructions = buildSearchInstructions(enabledModules);
    const prep = await prepareBriefBeforeClaude(moduleInstructions, user.id);
    const generated = await generateDailyBrief(
      { id: p.id, email: p.email, full_name: p.full_name, email_theme: emailTheme },
      prep.claudeInstructions,
      prep.prefetchedData,
    );
    generated.sections = applyWeatherErrorSection(generated.sections, prep);
    const newsRefined = await refineNewsInSections(generated.sections, moduleInstructions);
    generated.sections = stripErrorAndDuplicateSections(newsRefined.sections);

    const dateLabel = format(new Date(), 'EEEE, MMMM d, yyyy');
    const html = await render(
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

    const moduleStatus: Record<string, 'success' | 'error'> = {};
    for (const section of generated.sections) {
      moduleStatus[section.type] = (section.data as { error?: boolean })?.error ? 'error' : 'success';
    }

    return NextResponse.json({
      html,
      intro: generated.intro,
      sections: generated.sections,
      inputTokens: 0,
      outputTokens: generated.tokensUsed + newsRefined.extraTokens,
      totalTokens: generated.tokensUsed + newsRefined.extraTokens,
      generatedAt: new Date().toISOString(),
      moduleStatus,
      modulesIncluded: enabledModules.map((m) => m.module_type),
    });
  } catch (err) {
    console.error('[POST /api/email/preview-html]', err);
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    );
  }
}
