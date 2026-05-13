import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { buildSearchInstructions } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import { sendDailyBrief } from '@/lib/email/send';
import type { ModuleRow, Profile } from '@/types';

const TEST_SEND_LIMIT = 3;

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch profile with test send tracking columns
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, timezone, send_time, test_sends_today, test_sends_date, email_theme')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Rate limit: 3 test sends per day (UTC day)
    const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const isNewDay = profile.test_sends_date !== todayUTC;
    const sendsToday = isNewDay ? 0 : (profile.test_sends_today ?? 0);

    if (sendsToday >= TEST_SEND_LIMIT) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'You have reached the 3 test sends per day limit.' },
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
        { error: 'no_modules', message: 'Enable at least one module before sending a test.' },
        { status: 400 }
      );
    }

    // Increment counter before generating to claim the slot
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        test_sends_today: sendsToday + 1,
        test_sends_date: todayUTC,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[test-send] Failed to update rate limit counter:', updateError.message);
    }

    const emailTheme = (profile as { email_theme?: string }).email_theme ?? 'light';
    const p = profile as Pick<Profile, 'id' | 'email' | 'full_name' | 'timezone'> & { email_theme: string };
    p.email_theme = emailTheme;

    const moduleInstructions = buildSearchInstructions(modules as ModuleRow[]);
    const generated = await generateDailyBrief(p, moduleInstructions);
    const result = await sendDailyBrief(p, generated);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const remaining = TEST_SEND_LIMIT - (sendsToday + 1);
    return NextResponse.json({ success: true, remaining });
  } catch (err) {
    console.error('[POST /api/email/test-send]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
