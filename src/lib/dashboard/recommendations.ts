import { MODULE_DISPLAY_ORDER } from '@/lib/modules';

export function getModuleRecommendations(
  existingModules: { module_type: string }[],
): string[] {
  const owned = new Set(existingModules.map((m) => m.module_type));

  if (owned.size === 0) {
    return ['weather', 'news', 'quote'];
  }

  const candidates: string[] = [];

  if (owned.has('weather') && !owned.has('news')) candidates.unshift('news');
  if (owned.has('news') && !owned.has('quote')) candidates.push('quote');

  if (owned.has('weather') && owned.has('news') && owned.has('quote')) {
    for (const t of ['markets', 'sports', 'fact']) {
      if (!owned.has(t)) candidates.push(t);
    }
  }

  if (owned.has('markets') && !owned.has('sports')) candidates.push('sports');
  if (owned.has('markets') && !owned.has('on_this_day')) candidates.push('on_this_day');

  // Fill remaining from display order
  for (const type of MODULE_DISPLAY_ORDER) {
    if (!owned.has(type) && !candidates.includes(type)) {
      candidates.push(type);
    }
  }

  // Deduplicate preserving order
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of candidates) {
    if (!seen.has(c) && !owned.has(c)) {
      seen.add(c);
      result.push(c);
    }
    if (result.length >= 3) break;
  }

  return result;
}
