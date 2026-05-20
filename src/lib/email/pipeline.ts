import { createAdminClient } from '@/lib/supabase/admin';
import { buildSearchInstructions, MODULE_REGISTRY } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import { sendDailyBrief } from '@/lib/email/send';
import { prefetchModuleData } from '@/lib/email/prefetch';
import { getDailyCache, setDailyCache } from '@/lib/email/dailycache';
import {
  CACHEABLE_MODULES, buildCacheKey, getSearchCache, setSearchCache,
  STATIC_CACHEABLE_MODULES, buildStaticCacheKey, getStaticCache, setStaticCache,
} from '@/lib/email/cache';
import { refineNewsSection } from '@/lib/email/newsValidation';
import { log } from '@/lib/log';
import type { ModuleRow, ModuleSearchInstruction, SubscriptionStatus } from '@/types';
import type { GeneratedSection } from '@/lib/email/generate';

export interface PipelineResult {
  success: boolean;
  stage: 'modules' | 'generate' | 'send' | 'complete';
  error?: string;
  detail?: string;
  tokensUsed?: number;
  emailId?: string;
  prefetchedModules?: string[];
}

// History modules: prefetchedData holds raw Wikipedia events — Claude must pick and format them.
// All other prefetched data (weather, markets, currency, ai_tech, search cache hits) is already
// in final schema and can be injected directly without a Claude call.
const HISTORY_MODULES = new Set(['on_this_day', 'week_history']);

// A section payload is considered "errored" when:
//   1. Claude (or the weather guard) emits explicit `{ error: true }`, OR
//   2. The payload is structurally valid but Claude fabricated placeholder
//      filler (e.g. every reddit post.title === "Unavailable"). Earlier prompt
//      versions told Claude to "use placeholder data if real data is
//      unavailable" — we now tell it to use { error: true } instead, but old
//      cache rows still carry the filler shape and Claude still slips occasionally.
//
// We never want errored payloads to:
//   - persist to any cache (so subsequent users / sends don't inherit the failure)
//   - render to the user (they see a section omission, not a "Data unavailable" stub)
// Tight placeholder set: only obvious literal filler strings Claude reaches
// for when it bails. Empty strings and bare dashes are intentionally NOT
// included — they show up in legitimate content (an article with no URL,
// a delta of "-" for a flat currency) and would false-positive the filter.
const PLACEHOLDER_STRINGS = new Set(['unavailable', 'n/a', 'tbd', 'no data', 'no current data']);

function countPlaceholderFields(value: unknown): number {
  if (typeof value === 'string') {
    return PLACEHOLDER_STRINGS.has(value.trim().toLowerCase()) ? 1 : 0;
  }
  if (Array.isArray(value)) {
    return value.reduce<number>((sum, v) => sum + countPlaceholderFields(v), 0);
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (sum, v) => sum + countPlaceholderFields(v), 0
    );
  }
  return 0;
}

function isErrorPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  if ((data as { error?: boolean }).error === true) return true;
  // Heuristic placeholder check: 3+ string fields equal to a known filler
  // value strongly implies Claude faked the section. The threshold is
  // conservative on purpose — we only fire when the payload is obviously
  // pattern-filled rather than partially populated.
  if (countPlaceholderFields(data) >= 3) return true;
  return false;
}

export async function runPipeline(
  user: {
    id: string;
    email: string;
    full_name: string | null;
    email_theme: string;
    email_verbosity?: string | null;
    delivery_email?: string | null;
    timezone: string;
    subscription_status: SubscriptionStatus;
  },
  options?: { subjectSuffix?: string },
): Promise<PipelineResult> {
  const supabase = createAdminClient();

  // STAGE 1: Fetch modules
  log.info('pipeline', 'Stage 1: fetching modules', { userEmail: user.email });

  let modules: ModuleRow[];
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, stage: 'modules', error: 'No enabled modules found for this user' };
    }

    modules = data as ModuleRow[];
    log.info('pipeline', 'Modules found', {
      count: modules.length,
      moduleTypes: modules.map((m) => m.module_type),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('pipeline', 'Module fetch failed', { error: String(err) });
    return { success: false, stage: 'modules', error: message, detail: String(err) };
  }

  // FREE PLAN: replace topic-configurable module configs with defaults so free users
  // can't set custom topics/subtopics. DB value is never modified — upgrade restores preferences.
  const FREE_TOPIC_MODULES = new Set(['news', 'ai_tech', 'reddit', 'podcast', 'local_events']);
  const isFreePlan = !user.subscription_status || user.subscription_status === 'free';
  if (isFreePlan) {
    modules = modules.map((mod) => {
      if (!FREE_TOPIC_MODULES.has(mod.module_type)) return mod;
      const definition = MODULE_REGISTRY[mod.module_type];
      if (!definition) return mod;
      return { ...mod, config: definition.defaultConfig };
    });
    log.info('pipeline', 'Free plan — topic module configs reset to defaults');
  }

  // STAGE 2: Build search instructions (preserves display_order for final merge)
  log.info('pipeline', 'Stage 2: building search instructions');
  let moduleInstructions: ModuleSearchInstruction[];
  try {
    moduleInstructions = buildSearchInstructions(modules);
    if (moduleInstructions.length === 0) {
      return { success: false, stage: 'modules', error: 'No valid module configs after parsing' };
    }
    log.info('pipeline', 'Instructions built', {
      moduleTypes: moduleInstructions.map((m) => m.moduleType),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('pipeline', 'Instruction build failed', { error: String(err) });
    return { success: false, stage: 'generate', error: message, detail: String(err) };
  }

  // STAGE 2.5: Pre-fetch external API data + check shared/search caches
  log.info('pipeline', 'Stage 2.5: pre-fetching module data');
  let prefetchedData: Record<string, unknown> = {};
  try {
    const aiTechInst = moduleInstructions.find((m) => m.moduleType === 'ai_tech');
    if (aiTechInst) {
      const subtopics = (aiTechInst.config.subtopics as string[] | undefined) ?? [];
      const cacheKey = `ai_tech:${[...subtopics].sort().join(',')}`;
      const cached = await getDailyCache(cacheKey);
      if (cached) {
        prefetchedData['ai_tech'] = cached;
        log.info('pipeline', 'ai_tech served from shared cache');
      }
    }

    const apiData = await prefetchModuleData(moduleInstructions, user.id);
    prefetchedData = { ...prefetchedData, ...apiData };

    for (const inst of moduleInstructions) {
      if (!CACHEABLE_MODULES.has(inst.moduleType)) continue;
      if (prefetchedData[inst.moduleType] !== undefined) continue;
      const cacheKey = buildCacheKey(inst.moduleType, inst.config);
      const cached = await getSearchCache(cacheKey);
      // Skip cached error payloads — they would just resurface the same
      // "Data unavailable" stub from a prior failed run. Treating them as
      // cache miss forces a fresh Claude attempt.
      if (cached && !isErrorPayload(cached)) {
        prefetchedData[inst.moduleType] = cached;
        log.info('pipeline', 'served from search cache', { moduleType: inst.moduleType });
      } else if (cached) {
        log.warn('pipeline', 'search-cache entry is an error payload; treating as miss', {
          moduleType: inst.moduleType,
        });
      }
    }

    log.info('pipeline', 'pre-fetched modules', {
      modules: Object.keys(prefetchedData).length > 0 ? Object.keys(prefetchedData) : 'none',
    });
  } catch (err) {
    log.error('pipeline', 'Prefetch failed (non-fatal, continuing)', { error: String(err) });
  }

  // STAGE 2.6: Build resolved sections map — everything we can provide without a Claude call.
  // History modules stay out: prefetchedData holds raw Wikipedia events Claude must format.
  // All other prefetched data (weather, markets, currency, ai_tech, search-cached modules) is
  // already in final GeneratedSection.data shape — inject directly.
  const resolvedSections = new Map<string, unknown>();

  for (const [moduleType, data] of Object.entries(prefetchedData)) {
    if (!HISTORY_MODULES.has(moduleType)) {
      resolvedSections.set(moduleType, data);
    }
  }

  // Check 24-hour static module cache (quote, fact, affirmation, etc.)
  try {
    for (const inst of moduleInstructions) {
      if (!STATIC_CACHEABLE_MODULES.has(inst.moduleType)) continue;
      if (resolvedSections.has(inst.moduleType)) continue;
      const cacheKey = buildStaticCacheKey(inst.moduleType, inst.config);
      const cached = await getStaticCache(cacheKey);
      if (cached && !isErrorPayload(cached)) {
        resolvedSections.set(inst.moduleType, cached);
        log.info('pipeline', 'served from static cache', { moduleType: inst.moduleType });
      } else if (cached) {
        log.warn('pipeline', 'static-cache entry is an error payload; treating as miss', {
          moduleType: inst.moduleType,
        });
      }
    }
  } catch (err) {
    log.error('pipeline', 'Static cache check failed (non-fatal)', { error: String(err) });
  }

  // Weather is NEVER routed through Claude. If prefetch couldn't fill it
  // (Open-Meteo down, unbackfilled legacy row), render the section error
  // fallback so the email stays useful and the rest of the brief still ships.
  const weatherInst = moduleInstructions.find((i) => i.moduleType === 'weather');
  if (weatherInst && !resolvedSections.has('weather')) {
    log.warn('pipeline', 'weather prefetch missing — emitting error fallback');
    resolvedSections.set('weather', { error: true });
  }

  // Modules Claude still needs to handle: cache misses only
  const claudeInstructions = moduleInstructions.filter((i) => !resolvedSections.has(i.moduleType));
  // History prefetched data (raw Wikipedia events) is the only context Claude needs
  const claudePrefetchedData: Record<string, unknown> = {};
  for (const [moduleType, data] of Object.entries(prefetchedData)) {
    if (HISTORY_MODULES.has(moduleType)) claudePrefetchedData[moduleType] = data;
  }

  log.info('pipeline', 'Cache hit summary', {
    cacheHits: resolvedSections.size,
    totalModules: moduleInstructions.length,
  });
  if (claudeInstructions.length > 0) {
    log.info('pipeline', 'Claude cache misses', {
      moduleTypes: claudeInstructions.map((i) => i.moduleType),
    });
  }

  // STAGE 3: Generate via Claude — only cache-miss modules
  let tokensUsed = 0;
  if (claudeInstructions.length > 0) {
    log.info('pipeline', 'Stage 3: calling Claude API');
    let generated;
    try {
      generated = await generateDailyBrief(user, claudeInstructions, claudePrefetchedData);
      tokensUsed = generated.tokensUsed;
      log.info('pipeline', 'Generation successful', {
        tokensUsed,
        sections: generated.sections?.map((s) => s.type),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('pipeline', 'Claude generation failed', { error: String(err) });
      return { success: false, stage: 'generate', error: message, detail: String(err) };
    }

    // Refine the news section: validate, URL-check, retry up to once if short.
    // Runs BEFORE we cache or merge so bad articles never get persisted or shipped.
    const newsSectionIdx = generated.sections.findIndex((s) => s.type === 'news');
    if (newsSectionIdx !== -1) {
      const newsInst = claudeInstructions.find((m) => m.moduleType === 'news');
      // News is hardcoded to 3 articles. Legacy DB rows may still carry
      // articleCount: 5 or 10 — we ignore that value on purpose.
      const requestedCount = 3;
      const topics = (newsInst?.config.topics as string[] | undefined) ?? [];
      const customQuery = newsInst?.config.customQuery as string | undefined;
      const sources = newsInst?.config.sources as string[] | undefined;
      const excludeTopics = newsInst?.config.excludeTopics as string | undefined;

      log.info('pipeline', 'News refinement starting', { requestedCount });
      try {
        const refinement = await refineNewsSection({
          rawSectionData: generated.sections[newsSectionIdx].data,
          requestedCount,
          topics,
          customQuery,
          sources,
          excludeTopics,
        });

        const refinedData: { articles: typeof refinement.finalArticles; editorialNote?: string } = {
          articles: refinement.finalArticles,
        };
        if (refinement.underdelivered && refinement.finalArticles.length > 0) {
          const n = refinement.finalArticles.length;
          refinedData.editorialNote = `We found ${n} strong stor${n === 1 ? 'y' : 'ies'} for you today.`;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (generated.sections[newsSectionIdx] as any).data = refinedData;
        tokensUsed += refinement.retryTokens;

        log.info('pipeline', 'News refinement done', {
          retried: refinement.retried,
          finalCount: refinement.finalArticles.length,
          requestedCount,
          extraTokens: refinement.retryTokens,
        });
      } catch (err) {
        log.error('pipeline', 'News refinement failed (non-fatal, using raw output)', {
          error: String(err),
        });
      }
    }

    // Add Claude's output to the resolved map
    for (const section of generated.sections) {
      resolvedSections.set(section.type, section.data);
    }

    // Write ai_tech to daily cache for subsequent users (non-fatal). Error
    // payloads are intentionally skipped — caching a failure would lock
    // every user behind today's first cron's bad luck for the rest of the day.
    try {
      const aiTechSection = generated.sections.find((s) => s.type === 'ai_tech');
      const aiTechInst = claudeInstructions.find((m) => m.moduleType === 'ai_tech');
      if (aiTechSection && aiTechInst && !isErrorPayload(aiTechSection.data)) {
        const subtopics = (aiTechInst.config.subtopics as string[] | undefined) ?? [];
        const cacheKey = `ai_tech:${[...subtopics].sort().join(',')}`;
        await setDailyCache(cacheKey, aiTechSection.data);
        log.info('pipeline', 'ai_tech result cached for subsequent users');
      } else if (aiTechSection && isErrorPayload(aiTechSection.data)) {
        log.warn('pipeline', 'ai_tech section is an error payload; skipping cache write');
      }
    } catch (err) {
      log.error('pipeline', 'ai_tech cache write failed (non-fatal)', { error: String(err) });
    }

    // Write live search results to 12-hour search cache (non-fatal). Skip
    // error payloads so a bad reddit/news/podcast run doesn't poison the
    // cache for everyone else hitting it in the next 12 hours.
    try {
      for (const section of generated.sections) {
        if (!CACHEABLE_MODULES.has(section.type)) continue;
        if (isErrorPayload(section.data)) {
          log.warn('pipeline', 'section is an error payload; skipping search-cache write', {
            moduleType: section.type,
          });
          continue;
        }
        const inst = claudeInstructions.find((m) => m.moduleType === section.type);
        if (!inst) continue;
        await setSearchCache(buildCacheKey(section.type, inst.config), section.data);
        log.info('pipeline', 'written to search cache', { moduleType: section.type });
      }
    } catch (err) {
      log.error('pipeline', 'Search cache write failed (non-fatal)', { error: String(err) });
    }

    // Write static module results to 24-hour static cache (non-fatal). Same
    // error-payload skip as above.
    try {
      for (const section of generated.sections) {
        if (!STATIC_CACHEABLE_MODULES.has(section.type)) continue;
        if (isErrorPayload(section.data)) {
          log.warn('pipeline', 'section is an error payload; skipping static-cache write', {
            moduleType: section.type,
          });
          continue;
        }
        const inst = claudeInstructions.find((m) => m.moduleType === section.type);
        if (!inst) continue;
        await setStaticCache(buildStaticCacheKey(section.type, inst.config), section.data);
        log.info('pipeline', 'written to static cache', { moduleType: section.type });
      }
    } catch (err) {
      log.error('pipeline', 'Static cache write failed (non-fatal)', { error: String(err) });
    }
  } else {
    log.info('pipeline', 'Stage 3: skipped — all modules resolved from cache');
  }

  // Merge: restore original display order from moduleInstructions.
  // Two filters applied:
  //   1. Dedupe by module_type. A user with two `sports` rows enabled (which
  //      shouldn't happen but does — onboarding/migration bugs) was rendering
  //      the same payload twice. We keep the lowest-display_order entry only.
  //   2. Drop any section whose payload is { error: true }. Per product rule:
  //      if a module can't be filled, omit it from the email rather than
  //      shipping a "Data unavailable" stub that reads identical day-to-day.
  const seenTypes = new Set<string>();
  const finalSections: GeneratedSection[] = moduleInstructions
    .map((inst) => {
      if (seenTypes.has(inst.moduleType)) {
        log.warn('pipeline', 'Duplicate module — skipping', {
          moduleType: inst.moduleType,
          displayOrder: inst.config?.display_order ?? null,
        });
        return null;
      }
      seenTypes.add(inst.moduleType);
      const data = resolvedSections.get(inst.moduleType);
      if (!data) {
        log.warn('pipeline', 'No data resolved — omitting from email', {
          moduleType: inst.moduleType,
        });
        return null;
      }
      if (isErrorPayload(data)) {
        log.warn('pipeline', 'resolved to an error payload — omitting from email', {
          moduleType: inst.moduleType,
        });
        return null;
      }
      return { type: inst.moduleType, data } as GeneratedSection;
    })
    .filter((s): s is GeneratedSection => s !== null);

  if (finalSections.length === 0) {
    return { success: false, stage: 'generate', error: 'No sections resolved — all modules failed' };
  }

  // STAGE 4: Send email
  log.info('pipeline', 'Stage 4: sending via Resend');
  let sendResult;
  try {
    sendResult = await sendDailyBrief(user, { sections: finalSections, tokensUsed }, options);
    log.info('pipeline', 'Send result', { sendResult });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('pipeline', 'Send failed', { error: String(err) });
    return { success: false, stage: 'send', error: message, detail: String(err) };
  }

  if (!sendResult.success) {
    return { success: false, stage: 'send', error: sendResult.error };
  }

  return {
    success: true,
    stage: 'complete',
    tokensUsed,
    emailId: sendResult.emailId,
    prefetchedModules: Array.from(resolvedSections.keys()),
  };
}
