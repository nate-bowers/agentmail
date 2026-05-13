import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PageShell from '@/components/layout/PageShell';
import PreviewClient from '@/components/dashboard/PreviewClient';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ModuleRow, Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function PreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: modules }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true }),
  ]);

  if (!profile) redirect('/login');

  const p = profile as Profile;
  const enabledModules = (modules ?? []) as ModuleRow[];

  if (enabledModules.length === 0) {
    return (
      <PageShell>
        <div className="py-8 flex flex-col items-center justify-center rounded-xl border border-surface-border bg-white py-16 text-center mt-8">
          <p className="font-medium text-ink">No modules enabled</p>
          <p className="mt-1 text-sm text-ink-muted">
            Enable at least one module to preview your daily brief.
          </p>
          <Button className="mt-5" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  function getTimezoneAbbr(tz: string): string {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? tz;
    } catch { return tz; }
  }

  function formatSendTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  return (
    <PageShell className="py-6">
      <PreviewClient
        modules={enabledModules}
        initialTheme={p.email_theme ?? 'light'}
        userEmail={user.email ?? ''}
        sendTime={formatSendTime(p.send_time)}
        timezone={getTimezoneAbbr(p.timezone)}
      />
    </PageShell>
  );
}
