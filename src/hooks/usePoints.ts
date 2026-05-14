import { getTotalPoints, getPointLimit_ForUser } from '@/lib/modules/points';
import { getPlanFromSubscriptionStatus } from '@/lib/stripe/plans';
import type { ModuleRow } from '@/types';

export function usePoints(modules: ModuleRow[], subscriptionStatus: string | null) {
  const used = getTotalPoints(modules);
  const limit = getPointLimit_ForUser(subscriptionStatus);
  const remaining = limit - used;
  const isAtLimit = remaining <= 0;
  const percentUsed = Math.min((used / limit) * 100, 100);
  const planId = getPlanFromSubscriptionStatus(subscriptionStatus);
  return { used, limit, remaining, isAtLimit, percentUsed, planId };
}
