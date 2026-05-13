import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ModuleList from '@/components/dashboard/ModuleList';
import ResendButton from '@/components/dashboard/ResendButton';
import type { ModuleRow, Profile } from '@/types';

function formatSendTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getTimezoneAbbr(tz: string): string {
  try {
    const abbr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value;
    return abbr ?? tz;
  } catch {
    return tz;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: profile }, { data: modules }, { data: recentLogs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('email_logs')
      .select('sent_at, status')
      .eq('user_id', user.id)
      .eq('status', 'success')
      .gte('sent_at', startOfToday.toISOString())
      .order('sent_at', { ascending: false })
      .limit(1),
  ]);

  if (!profile) redirect('/login');

  const p = profile as Profile;
  const tzAbbr = getTimezoneAbbr(p.timezone);

  const sentToday = (recentLogs?.length ?? 0) > 0;
  const lastSentAt = recentLogs?.[0]?.sent_at ?? null;
  const onCooldown = lastSentAt ? new Date(lastSentAt) > new Date(sixHoursAgo) : false;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your Daily Brief</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sent at{' '}
            <span className="font-medium text-foreground">
              {formatSendTime(p.send_time)}
            </span>{' '}
            {tzAbbr}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ResendButton sentToday={sentToday} onCooldown={onCooldown} />
          <Badge variant={p.subscription_status === 'active' ? 'default' : 'secondary'}>
            {p.subscription_status === 'active' ? 'Pro' : 'Free'}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard/settings" aria-label="Edit settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Module list */}
      <ModuleList
        initialModules={(modules ?? []) as ModuleRow[]}
        subscriptionStatus={p.subscription_status}
      />
    </div>
  );
}
