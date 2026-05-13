// Re-renders stored brief content with a new theme — no Claude call.
// Used by the preview page when the user changes appearance without regenerating.

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import type { GeneratedSection } from '@/lib/email/generate';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body?.sections || !Array.isArray(body.sections)) {
      return NextResponse.json({ error: 'sections array required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const theme = (body.theme as string | undefined) ?? 'light';
    const intro = body.intro as string | undefined;
    const sections = body.sections as GeneratedSection[];

    const dateLabel = format(new Date(), 'EEEE, MMMM d, yyyy');
    const html = await render(
      DailyBriefEmail({
        userName: profile?.full_name ?? profile?.email ?? 'there',
        date: dateLabel,
        intro: intro || undefined,
        sections,
        unsubscribeToken: 'preview',
        theme,
      })
    );

    return NextResponse.json({ html });
  } catch (err) {
    console.error('[POST /api/email/render-only]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Render failed' },
      { status: 500 }
    );
  }
}
