import { createHash } from 'crypto';
import { adminClient } from '@/lib/supabase/admin';

const TTL_HOURS = 12;

// Modules that benefit from cross-user caching (real-time search results).
// Excludes modules with user-specific config (weather, sports, currency)
// and those that don't use web_search at all.
export const CACHEABLE_MODULES = new Set([
  'news', 'reddit', 'ai_tech', 'local_events', 'week_history', 'podcast',
]);

export function buildCacheKey(moduleType: string, config: Record<string, unknown>): string {
  const stable = JSON.stringify(sortKeys(config));
  const hash = createHash('sha256').update(stable).digest('hex').slice(0, 16);
  return `${moduleType}:${hash}`;
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      const v = obj[k];
      acc[k] = typeof v === 'object' && v !== null && !Array.isArray(v)
        ? sortKeys(v as Record<string, unknown>)
        : v;
      return acc;
    }, {});
}

export async function getSearchCache(cacheKey: string): Promise<unknown | null> {
  try {
    const { data, error } = await adminClient
      .from('search_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    return data.data;
  } catch {
    return null;
  }
}

export async function setSearchCache(cacheKey: string, data: unknown): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();
  try {
    await adminClient
      .from('search_cache')
      .upsert({ cache_key: cacheKey, data, expires_at: expiresAt }, { onConflict: 'cache_key' });
  } catch (err) {
    console.error('[SearchCache] Failed to write cache:', err);
  }
}

export async function cleanExpiredSearchCache(): Promise<void> {
  try {
    const { error } = await adminClient
      .from('search_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
    if (error) console.error('[SearchCache] Cleanup failed:', error.message);
    else console.log('[SearchCache] Expired entries cleaned');
  } catch (err) {
    console.error('[SearchCache] Cleanup error:', err);
  }
}
