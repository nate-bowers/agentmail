export const MODULE_POINTS: Record<string, number> = {
  weather: 1,
  news: 2,
  quote: 1,
  markets: 1,
};

export const FREE_TIER_POINTS = 3;
export const PRO_TIER_POINTS = 12;

export function getTotalPoints(modules: { module_type: string }[]): number {
  return modules.reduce((sum, m) => sum + (MODULE_POINTS[m.module_type] ?? 1), 0);
}

export function getRemainingPoints(
  modules: { module_type: string }[],
  isPro: boolean
): number {
  const limit = isPro ? PRO_TIER_POINTS : FREE_TIER_POINTS;
  return limit - getTotalPoints(modules);
}
