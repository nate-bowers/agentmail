// Runs at 4 AM UTC — before any user briefs go out.
// Pre-warms shared daily cache entries so the first user of the day
// never waits for a cold fetch or Claude search.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getDailyCache, setDailyCache } from '@/lib/email/dailycache';
import { fetchHistoryEvents } from '@/lib/fetchers/history';
import { generateDailyBrief } from '@/lib/email/generate';
import { buildSearchInstructions } from '@/lib/modules';
import type { ModuleRow } from '@/types';

const DEFAULT_AI_TECH_SUBTOPICS = ['AI Models', 'Open Source', 'Big Tech', 'Startups'];

function verifyCronSecret(provided: string): boolean {
  const expected = process.env.CRON_SECRET ?? '';
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') ?? '';
  if (!verifyCronSecret(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[WarmCache] Starting at', new Date().toISOString());
  const results: Record<string, string> = {};

  // 1. History events (Wikipedia — shared for all on_this_day + week_history users)
  try {
    const existing = await getDailyCache('history_events');
    if (existing) {
      results.history_events = 'already cached';
    } else {
      const data = await fetchHistoryEvents();
      if (data) {
        await setDailyCache('history_events', data);
        results.history_events = `cached ${(data.events as unknown[]).length} events`;
      } else {
        results.history_events = 'fetch returned null';
      }
    }
  } catch (err) {
    results.history_events = `error: ${err}`;
  }

  // 2. AI tech (Claude web search — shared for all users with default subtopics)
  try {
    const cacheKey = `ai_tech:${[...DEFAULT_AI_TECH_SUBTOPICS].sort().join(',')}`;
    const existing = await getDailyCache(cacheKey);
    if (existing) {
      results.ai_tech = 'already cached';
    } else {
      const fakeUser = { email: 'warmcache@internal', full_name: null, email_theme: 'light' };
      const fakeModule: ModuleRow = {
        id: 'warmcache',
        user_id: 'warmcache',
        module_type: 'ai_tech',
        config: { subtopics: DEFAULT_AI_TECH_SUBTOPICS, depth: 'headlines' },
        display_order: 0,
        is_enabled: true,
        created_at: new Date().toISOString(),
      };
      const instructions = buildSearchInstructions([fakeModule]);
      if (instructions.length > 0) {
        const generated = await generateDailyBrief(fakeUser, instructions);
        const section = generated.sections.find((s) => s.type === 'ai_tech');
        if (section) {
          await setDailyCache(cacheKey, section.data);
          results.ai_tech = `cached (${generated.tokensUsed} tokens)`;
        } else {
          results.ai_tech = 'no ai_tech section in response';
        }
      }
    }
  } catch (err) {
    results.ai_tech = `error: ${err}`;
  }

  console.log('[WarmCache] Done:', results);
  return NextResponse.json({ timestamp: new Date().toISOString(), results });
}
