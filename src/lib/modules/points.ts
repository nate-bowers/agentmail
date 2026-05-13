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
};

export const FREE_TIER_POINTS = 3;
export const PRO_TIER_POINTS = 12;

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
  isPro: boolean
): number {
  const limit = isPro ? PRO_TIER_POINTS : FREE_TIER_POINTS;
  return limit - getTotalPoints(modules);
}
