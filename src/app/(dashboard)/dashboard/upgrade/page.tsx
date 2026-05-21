import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, CheckCircle2, Sparkles, X } from 'lucide-react';

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
import { getPlanFromSubscriptionStatus } from '@/lib/stripe/plans';

const HIGHLIGHTED_PRO = new Set(['Module credits', 'Custom send time', 'Access to all 22 modules']);

const benefits = [
  { label: 'Module credits', freeValue: '3 credits', proValue: '12 credits', freeIncluded: true },
  { label: 'Daily email brief', freeValue: 'every day', proValue: 'every day', freeIncluded: true },
  { label: 'Custom send time', freeValue: '7:00 AM only', proValue: 'any time you choose', freeIncluded: false },
  { label: 'Custom timezone', freeValue: null, proValue: 'any timezone', freeIncluded: false },
  { label: 'Email theme', freeValue: 'Light only', proValue: 'Light, Dark, Pink', freeIncluded: false },
  { label: 'Email length', freeValue: null, proValue: 'Succinct or Wordy', freeIncluded: false },
  { label: 'News topics and subtopics', freeValue: 'default headlines only', proValue: 'fully customizable', freeIncluded: false },
  { label: 'Custom news sources', freeValue: null, proValue: 'specify preferred outlets', freeIncluded: false },
  { label: 'Local events module', freeValue: null, proValue: 'your city and categories', freeIncluded: false },
  { label: 'Interests and personalization', freeValue: null, proValue: 'podcasts, books, recipes and more', freeIncluded: false },
  { label: 'Sports scores', freeValue: null, proValue: 'your teams and leagues', freeIncluded: false },
  { label: 'Markets and crypto', freeValue: null, proValue: 'custom symbols and watchlist', freeIncluded: false },
  { label: 'Language learning module', freeValue: null, proValue: 'any language, any level', freeIncluded: false },
  { label: 'AI and tech briefing', freeValue: null, proValue: 'custom subtopics and depth', freeIncluded: false },
  { label: 'Access to all 22 modules', freeValue: null, proValue: 'current and future modules', freeIncluded: false },
  { label: 'Cancel anytime', freeValue: 'n/a', proValue: 'no questions asked', freeIncluded: true },
];

function BenefitRow({
  included,
  isPro,
  label,
  freeValue,
  proValue,
}: {
  included: boolean;
  isPro: boolean;
  label: string;
  freeValue?: string;
  proValue?: string;
}) {
  const highlight = isPro && HIGHLIGHTED_PRO.has(label);
  return (
    <div className={`flex items-start gap-2.5 py-2.5 border-b border-surface-border last:border-0 rounded-lg${highlight ? ' -mx-1 px-1 bg-brand-purple-light' : ''}`}>
      {isPro
        ? <Check className="h-4 w-4 text-brand-purple flex-shrink-0" />
        : included
          ? <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
          : <X className="h-4 w-4 text-ink-faint flex-shrink-0" />
      }
      <div>
        <span className={`text-sm ${included || isPro ? 'text-ink' : 'text-ink-muted'}`}>
          {label}
        </span>
        {isPro && proValue && (
          <span className={`text-xs ml-1 ${highlight ? 'text-brand-purple font-medium' : 'text-ink-muted'}`}>
            {proValue}
          </span>
        )}
        {!isPro && included && freeValue && (
          <span className="text-xs text-ink-muted ml-1">{freeValue}</span>
        )}
      </div>
    </div>
  );
}

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

        {/* Comparison */}
        <p className="text-center text-sm text-ink-muted mb-4">
          Everything in Free, plus all of this:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-6">
          {/* Free card */}
          <div className="rounded-2xl border border-surface-border p-5 bg-white order-last md:order-first">
            <div className="sticky top-0 bg-white pb-2 flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-ink-muted bg-surface-secondary rounded-full px-3 py-1">
                Free
              </span>
              <span className="text-sm text-ink-muted">$0 / month</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {benefits.map((b) => (
                <BenefitRow
                  key={b.label}
                  isPro={false}
                  included={b.freeIncluded}
                  label={b.label}
                  freeValue={b.freeValue ?? undefined}
                  proValue={undefined}
                />
              ))}
            </div>
          </div>

          {/* Pro card */}
          <div className="rounded-2xl border-2 border-brand-purple p-5 bg-white relative order-first md:order-last">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-brand-purple text-white text-xs font-semibold rounded-full px-3 py-1">
                Most popular
              </span>
            </div>
            <div className="sticky top-0 bg-white pb-2 flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-brand-purple bg-brand-purple-light rounded-full px-3 py-1">
                ✨ Pro
              </span>
              <span className="text-sm text-ink-muted">$9 / month</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {benefits.map((b) => (
                <BenefitRow
                  key={b.label}
                  isPro={true}
                  included={true}
                  label={b.label}
                  freeValue={undefined}
                  proValue={b.proValue ?? undefined}
                />
              ))}
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
              '12 module credits, 4x more than free',
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
        <p className="text-center text-sm text-ink-muted">
          {isActive
            ? "You're already on Brief Pro. Enjoy your 12 credits."
            : `You're on the free plan with ${pointsUsed} of 3 credits used. Upgrade to unlock ${3 - pointsUsed} more credits and full customization.`
          }
        </p>
      </div>
    </PageShell>
  );
}
