import { createHash } from 'crypto';
import { adminClient } from '@/lib/supabase/admin';

const TTL_HOURS = 12;
const STATIC_TTL_HOURS = 24;

// Modules that benefit from cross-user caching (real-time search results).
// Excludes modules with user-specific config (weather, sports, currency)
// and those that don't use web_search at all.
export const CACHEABLE_MODULES = new Set([
  'news', 'reddit', 'ai_tech', 'local_events', 'week_history', 'podcast',
]);

// Stateless modules whose output depends only on user config, not real-time data.
// Safe to cache for 24 hours keyed by moduleType + config hash + date.
export const STATIC_CACHEABLE_MODULES = new Set([
  'quote', 'fact', 'affirmation', 'mindfulness', 'book', 'challenge',
  'language', 'word_of_day', 'workout', 'recipe', 'horoscope',
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

// Strips empty/whitespace string values so `customContext: ""` hashes the same as absent.
function normalizeConfigForCaching(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = value;
  }
  return out;
}

// Date-scoped key: static:moduleType:configHash:YYYY-MM-DD
// The date component ensures fresh content each calendar day regardless of TTL.
export function buildStaticCacheKey(moduleType: string, config: Record<string, unknown>): string {
  const date = new Date().toISOString().slice(0, 10);
  const stable = JSON.stringify(sortKeys(normalizeConfigForCaching(config)));
  const hash = createHash('sha256').update(stable).digest('hex').slice(0, 16);
  return `static:${moduleType}:${hash}:${date}`;
}

export async function getStaticCache(cacheKey: string): Promise<unknown | null> {
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

export async function setStaticCache(cacheKey: string, data: unknown): Promise<void> {
  const expiresAt = new Date(Date.now() + STATIC_TTL_HOURS * 60 * 60 * 1000).toISOString();
  try {
    await adminClient
      .from('search_cache')
      .upsert({ cache_key: cacheKey, data, expires_at: expiresAt }, { onConflict: 'cache_key' });
  } catch (err) {
    console.error('[StaticCache] Failed to write cache:', err);
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
