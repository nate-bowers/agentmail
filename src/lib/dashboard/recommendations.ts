import { MODULE_DISPLAY_ORDER } from '@/lib/modules';
import { getModulePoints } from '@/lib/modules/points';

export function getModuleRecommendations(
  existingModules: { module_type: string; config?: Record<string, unknown> }[],
  remainingPoints?: number,
): string[] {
  const owned = new Set(existingModules.map((m) => m.module_type));

  if (owned.size === 0) {
    return ['weather', 'news', 'quote'];
  }

  const candidates: string[] = [];

  if (owned.has('weather') && !owned.has('news')) candidates.unshift('news');
  if (owned.has('news') && !owned.has('quote')) candidates.push('quote');

  if (owned.has('weather') && owned.has('news') && owned.has('quote')) {
    for (const t of ['markets', 'recipe', 'ai_tech']) {
      if (!owned.has(t)) candidates.push(t);
    }
  }

  if (owned.has('markets') && !owned.has('sports')) candidates.push('sports');
  if (owned.has('markets')) {
    for (const t of ['reddit', 'book']) {
      if (!owned.has(t)) candidates.push(t);
    }
  }

  if (owned.has('sports')) {
    for (const t of ['on_this_day', 'week_history']) {
      if (!owned.has(t)) candidates.push(t);
    }
  }

  if (owned.size >= 8) {
    for (const t of ['challenge', 'affirmation', 'local_events']) {
      if (!owned.has(t)) candidates.push(t);
    }
  }

  // Fill remaining from display order
  for (const type of MODULE_DISPLAY_ORDER) {
    if (!owned.has(type) && !candidates.includes(type)) {
      candidates.push(type);
    }
  }

  // Deduplicate preserving order, filter by affordability
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of candidates) {
    if (seen.has(c) || owned.has(c)) continue;
    seen.add(c);
    if (remainingPoints !== undefined) {
      const cost = getModulePoints(c, {});
      if (cost > remainingPoints) continue;
    }
    result.push(c);
    if (result.length >= 3) break;
  }

  return result;
}
