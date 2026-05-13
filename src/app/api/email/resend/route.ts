import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDailyBrief } from '@/lib/email/generate';
import { sendDailyBrief } from '@/lib/email/send';
import type { ModuleRow, Profile } from '@/types';

// Minimum gap between manual resends (6 hours)
const RESEND_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, timezone, send_time, email_theme')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Enforce 6-hour cooldown based on last successful send
    const cooldownCutoff = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString();
    const { count } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'success')
      .gte('sent_at', cooldownCutoff);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'cooldown', message: 'A brief was already sent in the last 6 hours.' },
        { status: 429 }
      );
    }

    // Fetch enabled modules
    const { data: modules } = await supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    if (!modules?.length) {
      return NextResponse.json(
        { error: 'no_modules', message: 'Enable at least one module first.' },
        { status: 400 }
      );
    }

    const p = profile as Pick<Profile, 'id' | 'email' | 'full_name' | 'timezone'>;

    const emailTheme = (profile as { email_theme?: string }).email_theme ?? 'light';
    const { brief, inputTokens, outputTokens } = await generateDailyBrief(p, modules as ModuleRow[], emailTheme);
    const result = await sendDailyBrief(p, brief, emailTheme, inputTokens + outputTokens);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/email/resend]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
