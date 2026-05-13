import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { buildSearchInstructions } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import type { ModuleRow, Profile } from '@/types';

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

    const emailTheme = themeOverride ?? p.email_theme ?? 'light';
    const moduleInstructions = buildSearchInstructions(enabledModules);
    const generated = await generateDailyBrief(
      { id: p.id, email: p.email, full_name: p.full_name, email_theme: emailTheme },
      moduleInstructions,
    );

    const dateLabel = format(new Date(), 'EEEE, MMMM d, yyyy');
    const html = await render(
      DailyBriefEmail({
        userName: p.full_name ?? p.email,
        date: dateLabel,
        intro: generated.intro || undefined,
        sections: generated.sections,
        unsubscribeToken: 'preview',
        theme: emailTheme,
      })
    );

    const moduleStatus: Record<string, 'success' | 'error'> = {};
    for (const section of generated.sections) {
      moduleStatus[section.type] = (section.data as { error?: boolean })?.error ? 'error' : 'success';
    }

    return NextResponse.json({
      html,
      inputTokens: 0,
      outputTokens: generated.tokensUsed,
      totalTokens: generated.tokensUsed,
      generatedAt: new Date().toISOString(),
      moduleStatus,
      modulesIncluded: enabledModules.map((m) => m.module_type),
    });
  } catch (err) {
    console.error('[POST /api/email/preview-html]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
