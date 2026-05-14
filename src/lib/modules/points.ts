export const MODULE_POINTS: Record<string, number> = {
  weather: 1,
  news: 2,
  quote: 1,
  markets: 1,
  sports: 1,
  word_of_day: 1,
  workout: 1,
  mindfulness: 1,
  on_this_day: 1,
  currency: 1,
  podcast: 1,
  fact: 1,
  recipe: 1,
  book: 1,
  reddit: 1,
  horoscope: 1,
  language: 1,
  affirmation: 1,
  ai_tech: 2,
  local_events: 1,
  week_history: 1,
  challenge: 1,
};

import { PLANS, getPointLimit, getPlanFromSubscriptionStatus } from '@/lib/stripe/plans';

// Re-exported for backward compatibility with callers that haven't migrated yet
export const FREE_TIER_POINTS = PLANS.free.pointLimit;
export const PRO_TIER_POINTS = PLANS.pro.pointLimit;

export function getPointLimit_ForUser(subscriptionStatus: string | null): number {
  return getPointLimit(getPlanFromSubscriptionStatus(subscriptionStatus));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModulePoints(moduleType: string, config: Record<string, any>): number {
  if (moduleType === 'news') {
    const count = (config.articleCount as number) ?? 5;
    if (count <= 3) return 1;
    if (count <= 5) return 2;
    return 3;
  }
  return MODULE_POINTS[moduleType] ?? 1;
}

export function getTotalPoints(
  modules: { module_type: string; config?: Record<string, unknown> }[]
): number {
  return modules.reduce((sum, m) => sum + getModulePoints(m.module_type, m.config ?? {}), 0);
}

export function getRemainingPoints(
  modules: { module_type: string; config?: Record<string, unknown> }[],
  subscriptionStatus: string | null
): number {
  return getPointLimit_ForUser(subscriptionStatus) - getTotalPoints(modules);
}
