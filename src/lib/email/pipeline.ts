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
  console.log(`[Pipeline] Stage 1: Fetching modules for ${user.email}`);

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
    console.log(`[Pipeline] Found ${modules.length} modules:`, modules.map((m) => m.module_type));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Module fetch failed:', err);
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
    console.log('[Pipeline] Free plan — topic module configs reset to defaults');
  }

  // STAGE 2: Build search instructions (preserves display_order for final merge)
  console.log('[Pipeline] Stage 2: Building search instructions');
  let moduleInstructions: ModuleSearchInstruction[];
  try {
    moduleInstructions = buildSearchInstructions(modules);
    if (moduleInstructions.length === 0) {
      return { success: false, stage: 'modules', error: 'No valid module configs after parsing' };
    }
    console.log('[Pipeline] Instructions built for:', moduleInstructions.map((m) => m.moduleType));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Instruction build failed:', err);
    return { success: false, stage: 'generate', error: message, detail: String(err) };
  }

  // STAGE 2.5: Pre-fetch external API data + check shared/search caches
  console.log('[Pipeline] Stage 2.5: Pre-fetching module data');
  let prefetchedData: Record<string, unknown> = {};
  try {
    const aiTechInst = moduleInstructions.find((m) => m.moduleType === 'ai_tech');
    if (aiTechInst) {
      const subtopics = (aiTechInst.config.subtopics as string[] | undefined) ?? [];
      const cacheKey = `ai_tech:${[...subtopics].sort().join(',')}`;
      const cached = await getDailyCache(cacheKey);
      if (cached) {
        prefetchedData['ai_tech'] = cached;
        console.log('[Pipeline] ai_tech served from shared cache');
      }
    }

    const apiData = await prefetchModuleData(moduleInstructions, user.id);
    prefetchedData = { ...prefetchedData, ...apiData };

    for (const inst of moduleInstructions) {
      if (!CACHEABLE_MODULES.has(inst.moduleType)) continue;
      if (prefetchedData[inst.moduleType] !== undefined) continue;
      const cacheKey = buildCacheKey(inst.moduleType, inst.config);
      const cached = await getSearchCache(cacheKey);
      if (cached) {
        prefetchedData[inst.moduleType] = cached;
        console.log(`[Pipeline] ${inst.moduleType} served from search cache`);
      }
    }

    console.log('[Pipeline] Pre-fetched:', Object.keys(prefetchedData).length > 0 ? Object.keys(prefetchedData) : 'none');
  } catch (err) {
    console.error('[Pipeline] Prefetch failed (non-fatal, continuing):', err);
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
      if (cached) {
        resolvedSections.set(inst.moduleType, cached);
        console.log(`[Pipeline] ${inst.moduleType} served from static cache`);
      }
    }
  } catch (err) {
    console.error('[Pipeline] Static cache check failed (non-fatal):', err);
  }

  // Weather is NEVER routed through Claude. If prefetch couldn't fill it
  // (Open-Meteo down, unbackfilled legacy row), render the section error
  // fallback so the email stays useful and the rest of the brief still ships.
  const weatherInst = moduleInstructions.find((i) => i.moduleType === 'weather');
  if (weatherInst && !resolvedSections.has('weather')) {
    console.warn('[Pipeline] weather prefetch missing — emitting error fallback');
    resolvedSections.set('weather', { error: true });
  }

  // Modules Claude still needs to handle: cache misses only
  const claudeInstructions = moduleInstructions.filter((i) => !resolvedSections.has(i.moduleType));
  // History prefetched data (raw Wikipedia events) is the only context Claude needs
  const claudePrefetchedData: Record<string, unknown> = {};
  for (const [moduleType, data] of Object.entries(prefetchedData)) {
    if (HISTORY_MODULES.has(moduleType)) claudePrefetchedData[moduleType] = data;
  }

  console.log(`[Pipeline] Cache hit: ${resolvedSections.size}/${moduleInstructions.length} modules`);
  if (claudeInstructions.length > 0) {
    console.log('[Pipeline] Claude cache misses:', claudeInstructions.map((i) => i.moduleType));
  }

  // STAGE 3: Generate via Claude — only cache-miss modules
  let tokensUsed = 0;
  if (claudeInstructions.length > 0) {
    console.log('[Pipeline] Stage 3: Calling Claude API');
    let generated;
    try {
      generated = await generateDailyBrief(user, claudeInstructions, claudePrefetchedData);
      tokensUsed = generated.tokensUsed;
      console.log('[Pipeline] Generation successful. Tokens used:', tokensUsed);
      console.log('[Pipeline] Sections generated:', generated.sections?.map((s) => s.type));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Pipeline] Claude generation failed:', err);
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

      console.log(`[Pipeline] News refinement starting — requested ${requestedCount} articles`);
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

        console.log(`[Pipeline] News refinement done — retried=${refinement.retried} final=${refinement.finalArticles.length}/${requestedCount} extraTokens=${refinement.retryTokens}`);
      } catch (err) {
        console.error('[Pipeline] News refinement failed (non-fatal, using raw output):', err);
      }
    }

    // Add Claude's output to the resolved map
    for (const section of generated.sections) {
      resolvedSections.set(section.type, section.data);
    }

    // Write ai_tech to daily cache for subsequent users (non-fatal)
    try {
      const aiTechSection = generated.sections.find((s) => s.type === 'ai_tech');
      const aiTechInst = claudeInstructions.find((m) => m.moduleType === 'ai_tech');
      if (aiTechSection && aiTechInst) {
        const subtopics = (aiTechInst.config.subtopics as string[] | undefined) ?? [];
        const cacheKey = `ai_tech:${[...subtopics].sort().join(',')}`;
        await setDailyCache(cacheKey, aiTechSection.data);
        console.log('[Pipeline] ai_tech result cached for subsequent users');
      }
    } catch (err) {
      console.error('[Pipeline] ai_tech cache write failed (non-fatal):', err);
    }

    // Write live search results to 12-hour search cache (non-fatal)
    try {
      for (const section of generated.sections) {
        if (!CACHEABLE_MODULES.has(section.type)) continue;
        const inst = claudeInstructions.find((m) => m.moduleType === section.type);
        if (!inst) continue;
        await setSearchCache(buildCacheKey(section.type, inst.config), section.data);
        console.log(`[Pipeline] ${section.type} written to search cache`);
      }
    } catch (err) {
      console.error('[Pipeline] Search cache write failed (non-fatal):', err);
    }

    // Write static module results to 24-hour static cache (non-fatal)
    try {
      for (const section of generated.sections) {
        if (!STATIC_CACHEABLE_MODULES.has(section.type)) continue;
        const inst = claudeInstructions.find((m) => m.moduleType === section.type);
        if (!inst) continue;
        await setStaticCache(buildStaticCacheKey(section.type, inst.config), section.data);
        console.log(`[Pipeline] ${section.type} written to static cache`);
      }
    } catch (err) {
      console.error('[Pipeline] Static cache write failed (non-fatal):', err);
    }
  } else {
    console.log('[Pipeline] Stage 3: Skipped — all modules resolved from cache');
  }

  // Merge: restore original display order from moduleInstructions
  const finalSections: GeneratedSection[] = moduleInstructions
    .map((inst) => {
      const data = resolvedSections.get(inst.moduleType);
      if (!data) {
        console.warn(`[Pipeline] No data resolved for ${inst.moduleType} — omitting from email`);
        return null;
      }
      return { type: inst.moduleType, data } as GeneratedSection;
    })
    .filter((s): s is GeneratedSection => s !== null);

  if (finalSections.length === 0) {
    return { success: false, stage: 'generate', error: 'No sections resolved — all modules failed' };
  }

  // STAGE 4: Send email
  console.log('[Pipeline] Stage 4: Sending via Resend');
  let sendResult;
  try {
    sendResult = await sendDailyBrief(user, { sections: finalSections, tokensUsed }, options);
    console.log('[Pipeline] Send result:', sendResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Send failed:', err);
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
