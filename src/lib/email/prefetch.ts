import { getDailyCache, setDailyCache } from './dailycache';
import { fetchWeather } from '@/lib/fetchers/weather';
import { fetchMarkets } from '@/lib/fetchers/markets';
import { fetchCurrency } from '@/lib/fetchers/currency';
import { fetchHistoryEvents } from '@/lib/fetchers/history';
import type { ModuleSearchInstruction } from '@/types';

export type PrefetchedData = Record<string, unknown>;

// Returns a map of moduleType -> pre-fetched data for every module that has
// a reliable external API. Modules not in this map fall through to Claude.
export async function prefetchModuleData(
  instructions: ModuleSearchInstruction[]
): Promise<PrefetchedData> {
  const results: PrefetchedData = {};

  await Promise.allSettled(
    instructions.map(async (inst) => {
      const data = await fetchForInstruction(inst);
      if (data !== null) {
        results[inst.moduleType] = data;
        console.log(`[Prefetch] ${inst.moduleType} — served from ${data === null ? 'miss' : 'API/cache'}`);
      }
    })
  );

  return results;
}

async function fetchForInstruction(inst: ModuleSearchInstruction): Promise<unknown | null> {
  try {
    switch (inst.moduleType) {

      case 'weather': {
        // Locations are stored as geocoded objects after the POST/PATCH normalization.
        // Legacy plain-string entries that haven't been backfilled are skipped here
        // so we never silently feed garbage to the forecast API; the user is notified
        // via the dashboard.
        const rawLocations = inst.config.locations as unknown;
        const units = (inst.config.units as 'imperial' | 'metric' | undefined) ?? 'imperial';
        if (!Array.isArray(rawLocations) || rawLocations.length === 0) return null;
        const geocoded = rawLocations.filter(
          (l): l is { input: string; display_name: string; latitude: number; longitude: number; timezone: string; country_code?: string } =>
            !!l && typeof l === 'object' && typeof (l as { latitude?: unknown }).latitude === 'number'
        );
        if (geocoded.length === 0) {
          console.warn('[Prefetch] weather has no geocoded locations — backfill required');
          return null;
        }
        const cacheKey = `weather:${units}:${geocoded.map((g) => `${g.latitude.toFixed(3)},${g.longitude.toFixed(3)}`).sort().join('|')}`;
        const cached = await getDailyCache(cacheKey);
        if (cached) return cached;
        const data = await fetchWeather(geocoded, units);
        if (data) await setDailyCache(cacheKey, data);
        return data;
      }

      case 'markets': {
        const symbols = inst.config.symbols as string[] | undefined;
        if (!symbols?.length) return null;
        const cacheKey = `markets:${[...symbols].sort().join(',')}`;
        const cached = await getDailyCache(cacheKey);
        if (cached) return cached;
        const data = await fetchMarkets(symbols);
        if (data) await setDailyCache(cacheKey, data);
        return data;
      }

      case 'currency': {
        const base = (inst.config.baseCurrency as string | undefined)?.toUpperCase() ?? 'USD';
        const targets = inst.config.targetCurrencies as string[] | undefined;
        if (!targets?.length) return null;
        const cacheKey = `currency:${base}:${[...targets].sort().join(',')}`;
        const cached = await getDailyCache(cacheKey);
        if (cached) return cached;
        const data = await fetchCurrency(base, targets);
        if (data) await setDailyCache(cacheKey, data);
        return data;
      }

      case 'on_this_day':
      case 'week_history': {
        // Both use Wikipedia events for today's date.
        // Claude receives the raw event list and applies the user's category/era filters.
        const cacheKey = 'history_events';
        const cached = await getDailyCache(cacheKey);
        if (cached) return cached;
        const data = await fetchHistoryEvents();
        if (data) await setDailyCache(cacheKey, data);
        return data;
      }

      // ai_tech: cache-after-first-user (handled in pipeline.ts post-generation)
      default:
        return null;
    }
  } catch (err) {
    console.error(`[Prefetch] Error for ${inst.moduleType}:`, err);
    return null; // non-fatal — Claude handles it
  }
}
