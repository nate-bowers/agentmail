'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getModulePoints, getPointLimit_ForUser } from '@/lib/modules/points';
import { getPlanFromSubscriptionStatus } from '@/lib/stripe/plans';

interface PointsBarProps {
  modules: { module_type: string; config?: Record<string, unknown> }[];
  subscriptionStatus: string;
  refreshing?: boolean;
}

export default function PointsBar({ modules, subscriptionStatus, refreshing }: PointsBarProps) {
  const totalPoints = modules.reduce(
    (sum, m) => sum + getModulePoints(m.module_type, m.config ?? {}),
    0
  );
  const limit = getPointLimit_ForUser(subscriptionStatus);
  const pct = Math.min((totalPoints / limit) * 100, 100);
  const atLimit = totalPoints >= limit;
  const isPro = getPlanFromSubscriptionStatus(subscriptionStatus) !== 'free';
  const showNudge = !isPro && totalPoints >= 2;

  let statusLabel = 'Plenty of room';
  let statusClass = 'text-green-600';
  if (atLimit) {
    statusLabel = 'No credits remaining';
    statusClass = 'text-red-600 font-medium';
  } else if (pct > 80) {
    statusLabel = 'Almost full';
    statusClass = 'text-red-500';
  } else if (pct > 50) {
    statusLabel = 'Running low';
    statusClass = 'text-amber-600';
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">{totalPoints} / {limit} credits used</span>
          <span className={statusClass}>{statusLabel}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              refreshing ? 'animate-pulse bg-brand-purple/50' : atLimit ? 'bg-red-500' : 'bg-brand-purple'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {showNudge && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-purple/20 bg-brand-purple-light p-4">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-purple" />
          <p className="flex-1 text-sm text-ink">
            {atLimit
              ? "You've used all your free credits. Add more modules with Brief Pro."
              : `You're using ${totalPoints} of 3 free credits. Upgrade to Pro for 12 credits and access to all modules.`}
          </p>
          <Button size="sm" onClick={() => { window.location.href = '/dashboard/upgrade'; }}>
            Upgrade →
          </Button>
        </div>
      )}
    </div>
  );
}
