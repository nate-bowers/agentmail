import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Lock, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upgrade to Brief Pro',
  description: 'Unlock 12 module credits and all features with Brief Pro for $9/month.',
};
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import UpgradeButton from '@/components/dashboard/UpgradeButton';
import PageShell from '@/components/layout/PageShell';
import { getTotalPoints } from '@/lib/modules/points';
import { getPlanFromSubscriptionStatus, PLANS } from '@/lib/stripe/plans';
import { cn } from '@/lib/utils';

const FREE_MODULES = [
  { label: 'Weather', pts: 1, included: true },
  { label: 'Quote', pts: 1, included: true },
  { label: 'Markets', pts: 1, included: true },
  { label: 'News digest', pts: 2, included: false },
  { label: 'Sports scores', pts: 1, included: false },
  { label: 'Word of the day', pts: 1, included: false },
];

const PRO_MODULES = [
  { label: 'Weather', pts: 1 },
  { label: 'News digest', pts: 2 },
  { label: 'Quote', pts: 1 },
  { label: 'Markets', pts: 1 },
  { label: 'Sports scores', pts: 1 },
  { label: 'Word of the day', pts: 1 },
  { label: 'Workout tip', pts: 1 },
  { label: 'Mindfulness', pts: 1 },
];

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: modules }] = await Promise.all([
    supabase.from('profiles').select('subscription_status').eq('id', user.id).single(),
    supabase.from('modules').select('module_type, config').eq('user_id', user.id),
  ]);

  const isActive = getPlanFromSubscriptionStatus(profile?.subscription_status ?? null) !== 'free';
  if (isActive) redirect('/dashboard?already_pro=true');
  const pointsUsed = getTotalPoints(
    (modules ?? []) as { module_type: string; config: Record<string, unknown> }[]
  );

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl space-y-4 pt-4 pb-6">
        {/* Back link */}
        <Button variant="ghost" size="sm" className="-ml-2 text-ink-muted" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="space-y-2 text-center pb-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple-light px-3 py-1 text-sm font-medium text-brand-purple">
            <Sparkles className="h-3.5 w-3.5" />
            Brief Pro
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Unlock your full morning brief
          </h1>
          <p className="text-sm text-ink-muted">
            Most people upgrade within their first week. Here&rsquo;s why.
          </p>
        </div>

        {/* Social proof strip */}
        <div className="rounded-xl bg-surface-secondary p-3">
          <div className="flex items-center justify-center divide-x divide-surface-border">
            {[
              { stat: '2 min', label: 'Setup time' },
              { stat: '12 credits', label: 'With Pro' },
              { stat: '$9/mo', label: 'Less than a coffee' },
            ].map(({ stat, label }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 px-5">
                <span className="font-bold text-ink">{stat}</span>
                <span className="text-xs text-ink-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Points comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Free */}
          <div className="rounded-xl border border-surface-border p-4 space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
              Free — 3 credits
            </p>
            <div className="space-y-1.5">
              {FREE_MODULES.map(({ label, pts, included }) => (
                <div
                  key={label}
                  className={cn(
                    'flex items-center gap-1.5 text-xs',
                    included ? 'text-ink' : 'text-ink-faint'
                  )}
                >
                  {included ? (
                    <span className="text-green-500 text-sm leading-none">✓</span>
                  ) : (
                    <Lock className="h-3 w-3 shrink-0" />
                  )}
                  <span className="flex-1">{label}</span>
                  <span className="text-[10px] text-ink-faint">({pts}pt)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-xl border-2 border-brand-purple bg-brand-purple/[0.03] p-4 space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-brand-purple">
              Pro — 12 credits
            </p>
            <div className="space-y-1.5">
              {PRO_MODULES.map(({ label, pts }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-ink">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-brand-purple" />
                  <span className="flex-1">{label}</span>
                  <span className="text-[10px] text-ink-faint">({pts}pt)</span>
                </div>
              ))}
              <p className="pt-0.5 text-xs font-medium text-brand-purple">+ 4 more credits to use</p>
            </div>
          </div>
        </div>

        {/* Pricing card */}
        <div className="mx-auto w-full max-w-sm rounded-2xl border border-surface-border bg-white p-5 shadow-sm space-y-3">
          <div>
            <p className="font-medium text-ink">Brief Pro</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-ink">$9</span>
              <span className="text-ink-muted">/month</span>
            </div>
          </div>

          <ul className="space-y-2">
            {[
              '12 module credits — 4x more than free',
              'All current and future modules',
              'Priority email delivery',
              'Cancel anytime, no questions asked',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ink">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple" />
                {f}
              </li>
            ))}
          </ul>

          {isActive ? (
            <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-center text-sm text-green-700">
              You&rsquo;re already on Brief Pro
            </div>
          ) : (
            <div className="mt-1">
              <UpgradeButton planId="pro" />
            </div>
          )}

          <div className="space-y-1 text-center mt-1">
            <p className="text-xs text-ink-muted">
              Secured by Stripe. Your card is never stored on our servers.
            </p>
            <p className="text-xs text-ink-faint">Visa · Mastercard · Amex · Apple Pay</p>
          </div>
        </div>

        {/* Current plan context */}
        {!isActive && (
          <p className="text-center text-sm text-ink-muted">
            You&rsquo;re currently on the free plan using {pointsUsed} of {PLANS.free.pointLimit} credits.
          </p>
        )}
      </div>
    </PageShell>
  );
}
