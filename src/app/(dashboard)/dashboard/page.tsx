import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your Daily Brief modules and delivery settings.',
};
import { Button } from '@/components/ui/button';
import PageShell from '@/components/layout/PageShell';
import ModuleList from '@/components/dashboard/ModuleList';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import ResendButton from '@/components/dashboard/ResendButton';
import TestSendButton from '@/components/dashboard/TestSendButton';
import { getTotalPoints, FREE_TIER_POINTS, PRO_TIER_POINTS } from '@/lib/modules/points';
import type { ModuleRow, Profile } from '@/types';

function formatSendTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getTimezoneAbbr(tz: string): string {
  try {
    const abbr = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
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
    supabase.from('modules').select('*').eq('user_id', user.id).order('display_order', { ascending: true }),
    supabase.from('email_logs').select('sent_at, status')
      .eq('user_id', user.id).eq('status', 'success')
      .gte('sent_at', startOfToday.toISOString())
      .order('sent_at', { ascending: false }).limit(1),
  ]);

  if (!profile) redirect('/login');

  const p = profile as Profile;
  const tzAbbr = getTimezoneAbbr(p.timezone);
  const sentToday = (recentLogs?.length ?? 0) > 0;
  const lastSentAt = recentLogs?.[0]?.sent_at ?? null;
  const onCooldown = lastSentAt ? new Date(lastSentAt) > new Date(sixHoursAgo) : false;
  const isPro = p.subscription_status === 'active';

  const moduleList = (modules ?? []) as ModuleRow[];
  const pointsUsed = getTotalPoints(moduleList);
  const pointsLimit = isPro ? PRO_TIER_POINTS : FREE_TIER_POINTS;
  const pointsPct = Math.min((pointsUsed / pointsLimit) * 100, 100);
  const atLimit = pointsUsed >= pointsLimit;

  return (
    <>
    {!p.has_onboarded && (
      <OnboardingGate userId={user.id} />
    )}
    <PageShell>
      <div className="py-2 lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
        {/* Main content — 2 cols */}
        <div className="lg:col-span-2">
          <ModuleList
            initialModules={moduleList}
            subscriptionStatus={p.subscription_status}
          />
        </div>

        {/* Sidebar — 1 col */}
        <div className="mt-8 space-y-4 lg:mt-0">
          {/* Delivery card */}
          <div className="rounded-xl border border-surface-border border-t-[3px] border-t-brand-purple bg-white p-5">
            <p className="font-medium text-ink">Delivery</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-brand-purple shrink-0" />
              <span className="font-medium text-ink">{formatSendTime(p.send_time)}</span>
              <span className="text-ink-muted">{tzAbbr}</span>
            </div>
            <Link
              href="/dashboard/settings"
              className="mt-2 inline-block text-xs text-brand-purple hover:text-brand-purple-dark"
            >
              Edit settings →
            </Link>
          </div>

          {/* Account card */}
          <div className="rounded-xl border border-surface-border border-t-[3px] border-t-brand-purple bg-white p-5">
            <p className="font-medium text-ink">Account</p>
            <p className="mt-2 text-sm text-ink-muted truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              {isPro ? (
                <span className="inline-flex items-center rounded-full bg-brand-purple px-2.5 py-0.5 text-xs font-medium text-white">
                  Pro
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-surface-border bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                  Free
                </span>
              )}
            </div>

            {/* Compact points bar */}
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-ink-muted">{pointsUsed} / {pointsLimit} credits</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${atLimit ? 'bg-red-500' : 'bg-brand-purple'}`}
                  style={{ width: `${pointsPct}%` }}
                />
              </div>
            </div>

            {!isPro && (
              <Link
                href="/dashboard/upgrade"
                className="mt-3 inline-block text-sm text-brand-purple hover:text-brand-purple-dark"
              >
                Upgrade to Pro →
              </Link>
            )}
            {isPro && (
              <Link
                href="/dashboard/settings"
                className="mt-3 inline-block text-sm text-brand-purple hover:text-brand-purple-dark"
              >
                Manage subscription
              </Link>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-surface-border border-t-[3px] border-t-brand-purple bg-white p-5 space-y-2">
            <p className="font-medium text-ink">Quick Actions</p>
            <div className="flex flex-col gap-2 mt-3">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href="/dashboard/preview">Preview my brief</Link>
              </Button>
              <TestSendButton />
              {sentToday && (
                <ResendButton sentToday={sentToday} onCooldown={onCooldown} />
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
    </>
  );
}
