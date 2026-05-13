import { adminClient } from '@/lib/supabase/admin';

export async function getDailyCache(cacheKey: string): Promise<unknown | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await adminClient
    .from('daily_cache')
    .select('data')
    .eq('cache_key', cacheKey)
    .eq('cache_date', today)
    .maybeSingle();
  return data?.data ?? null;
}

export async function setDailyCache(cacheKey: string, data: unknown): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await adminClient
    .from('daily_cache')
    .upsert(
      { cache_key: cacheKey, cache_date: today, data, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key,cache_date' }
    );
}
