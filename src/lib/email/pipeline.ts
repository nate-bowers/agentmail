import { createAdminClient } from '@/lib/supabase/admin';
import { buildSearchInstructions } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import { sendDailyBrief } from '@/lib/email/send';
import { prefetchModuleData } from '@/lib/email/prefetch';
import { getDailyCache, setDailyCache } from '@/lib/email/dailycache';
import { CACHEABLE_MODULES, buildCacheKey, getSearchCache, setSearchCache } from '@/lib/email/cache';
import type { ModuleRow } from '@/types';

export interface PipelineResult {
  success: boolean;
  stage: 'modules' | 'generate' | 'send' | 'complete';
  error?: string;
  detail?: string;
  tokensUsed?: number;
  emailId?: string;
  prefetchedModules?: string[];
}

export async function runPipeline(user: {
  id: string;
  email: string;
  full_name: string | null;
  email_theme: string;
  email_verbosity?: string | null;
  delivery_email?: string | null;
  timezone: string;
}): Promise<PipelineResult> {
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

  // STAGE 2: Build search instructions
  console.log('[Pipeline] Stage 2: Building search instructions');
  let moduleInstructions;
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

  // STAGE 2.5: Pre-fetch external API data + check shared cache
  console.log('[Pipeline] Stage 2.5: Pre-fetching module data');
  let prefetchedData: Record<string, unknown> = {};
  try {
    // Check if any modules have a cached ai_tech result
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

    // Pre-fetch weather/markets/currency/history via external APIs
    const apiData = await prefetchModuleData(moduleInstructions);
    prefetchedData = { ...prefetchedData, ...apiData };

    // Check 12-hour search cache for cacheable modules not yet prefetched
    for (const inst of moduleInstructions) {
      if (!CACHEABLE_MODULES.has(inst.moduleType)) continue;
      if (prefetchedData[inst.moduleType] !== undefined) continue; // already have data
      const cacheKey = buildCacheKey(inst.moduleType, inst.config);
      const cached = await getSearchCache(cacheKey);
      if (cached) {
        prefetchedData[inst.moduleType] = cached;
        console.log(`[Pipeline] ${inst.moduleType} served from search cache`);
      }
    }

    const prefetchedModules = Object.keys(prefetchedData);
    console.log('[Pipeline] Pre-fetched:', prefetchedModules.length > 0 ? prefetchedModules : 'none');
  } catch (err) {
    // Non-fatal: fall back to Claude search for all modules
    console.error('[Pipeline] Prefetch failed (non-fatal, continuing):', err);
  }

  // STAGE 3: Generate via Claude
  console.log('[Pipeline] Stage 3: Calling Claude API');
  let generated;
  try {
    generated = await generateDailyBrief(user, moduleInstructions, prefetchedData);
    console.log('[Pipeline] Generation successful. Tokens used:', generated.tokensUsed);
    console.log('[Pipeline] Sections generated:', generated.sections?.map((s) => s.type));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Claude generation failed:', err);
    return { success: false, stage: 'generate', error: message, detail: String(err) };
  }

  // Cache ai_tech result for subsequent users today (non-fatal)
  try {
    const aiTechSection = generated.sections.find((s) => s.type === 'ai_tech');
    const aiTechInst = moduleInstructions.find((m) => m.moduleType === 'ai_tech');
    if (aiTechSection && aiTechInst && !prefetchedData['ai_tech']) {
      const subtopics = (aiTechInst.config.subtopics as string[] | undefined) ?? [];
      const cacheKey = `ai_tech:${[...subtopics].sort().join(',')}`;
      await setDailyCache(cacheKey, aiTechSection.data);
      console.log('[Pipeline] ai_tech result cached for subsequent users');
    }
  } catch (err) {
    console.error('[Pipeline] ai_tech cache write failed (non-fatal):', err);
  }

  // Write newly searched cacheable sections to the 12-hour search cache
  try {
    for (const section of generated.sections) {
      if (!CACHEABLE_MODULES.has(section.type)) continue;
      if (prefetchedData[section.type] !== undefined) continue; // was already a cache hit
      const inst = moduleInstructions.find((m) => m.moduleType === section.type);
      if (!inst) continue;
      const cacheKey = buildCacheKey(section.type, inst.config);
      await setSearchCache(cacheKey, section.data);
      console.log(`[Pipeline] ${section.type} written to search cache`);
    }
  } catch (err) {
    console.error('[Pipeline] Search cache write failed (non-fatal):', err);
  }

  // STAGE 4: Send email
  console.log('[Pipeline] Stage 4: Sending via Resend');
  let sendResult;
  try {
    sendResult = await sendDailyBrief(user, generated);
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
    tokensUsed: generated.tokensUsed,
    emailId: sendResult.emailId,
    prefetchedModules: Object.keys(prefetchedData),
  };
}
