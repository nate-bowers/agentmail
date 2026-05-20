import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 5 requests per hour per user
  const limit = rateLimit(`data_export:${user.id}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many export requests. Try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(limit.resetAt).toISOString(),
        },
      }
    );
  }

  // Profile — full row scoped to this user via RLS-bound client.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      [
        'id',
        'email',
        'full_name',
        'timezone',
        'send_time',
        'is_active',
        'stripe_customer_id',
        'subscription_status',
        'email_theme',
        'email_verbosity',
        'delivery_email',
        'preview_generations_today',
        'preview_generations_date',
        'test_sends_today',
        'test_sends_date',
        'has_onboarded',
        'onboarding_step',
        'onboarding_test_email_acknowledged',
        'welcome_email_sent',
        'created_at',
        'updated_at',
      ].join(', ')
    )
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('[user/export] profile error:', profileError.message);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }

  // Modules — strictly filtered to this user.
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('id, user_id, module_type, config, display_order, is_enabled, created_at')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true });

  if (modulesError) {
    console.error('[user/export] modules error:', modulesError.message);
    return NextResponse.json({ error: 'Failed to load modules' }, { status: 500 });
  }

  // Last 100 email log entries for this user.
  const { data: emailLogs, error: logsError } = await supabase
    .from('email_logs')
    .select('id, user_id, sent_at, status, error_message, modules_included')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(100);

  if (logsError) {
    console.error('[user/export] email_logs error:', logsError.message);
    return NextResponse.json({ error: 'Failed to load email logs' }, { status: 500 });
  }

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `daily-brief-data-export-${datePart}.json`;

  const payload = {
    exported_at: now.toISOString(),
    user: {
      profile,
      modules: modules ?? [],
      email_logs: emailLogs ?? [],
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
