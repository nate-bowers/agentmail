import { getTotalPoints, FREE_TIER_POINTS, PRO_TIER_POINTS } from '@/lib/modules/points';
import type { ModuleRow } from '@/types';

export function usePoints(modules: ModuleRow[], isPro: boolean) {
  const used = getTotalPoints(modules);
  const limit = isPro ? PRO_TIER_POINTS : FREE_TIER_POINTS;
  const remaining = limit - used;
  const isAtLimit = remaining <= 0;
  const percentUsed = Math.min((used / limit) * 100, 100);
  return { used, limit, remaining, isAtLimit, percentUsed };
}
