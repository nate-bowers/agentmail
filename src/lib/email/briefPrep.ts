// Shared "before Claude" prep used by every brief-generation path: test-send,
// resend, preview-html, generate-preview. The production cron uses runPipeline
// which has its own copy of this logic for now.
//
// Two responsibilities:
//   1. Prefetch external API data (weather via Open-Meteo, markets, currency,
//      history) so Claude only handles modules that genuinely need it.
//   2. Guard weather: if the user has a weather module but prefetch couldn't
//      resolve it, strip weather from Claude's instructions and emit a
//      SectionErrorFallback at the original position. Without this guard
//      Claude receives an empty instruction (since weather's buildSearchInstruction
//      is now a no-op) and either hallucinates or breaks the JSON.

import type { GeneratedSection } from './generate';
import { prefetchModuleData } from './prefetch';
import { refineNewsSection } from './newsValidation';
import type { ModuleSearchInstruction } from '@/types';

export interface BriefPrep {
  /** Pre-resolved final-shape data, passed straight into the Claude prompt as `STATIC` blocks. */
  prefetchedData: Record<string, unknown>;
  /** Instructions to actually send to Claude. May exclude weather if it failed to prefetch. */
  claudeInstructions: ModuleSearchInstruction[];
  /** If the user has a weather module that couldn't be prefetched, this is the error section to splice in after Claude runs. */
  weatherErrorSection: GeneratedSection | null;
  /** Index where the weather error section should be inserted (matches the original instruction order). */
  weatherErrorIndex: number;
}

// See pipeline.ts for the rationale. Same heuristic kept in sync here so the
// bypass routes catch placeholder shapes too.
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
  if (countPlaceholderFields(data) >= 3) return true;
  return false;
}

export async function prepareBriefBeforeClaude(
  moduleInstructions: ModuleSearchInstruction[],
  userId?: string,
): Promise<BriefPrep> {
  let prefetchedData: Record<string, unknown> = {};
  try {
    prefetchedData = await prefetchModuleData(moduleInstructions, userId);
  } catch (err) {
    console.error('[briefPrep] Prefetch failed (non-fatal):', err);
  }

  const weatherInst = moduleInstructions.find((i) => i.moduleType === 'weather');
  const weatherIdx = moduleInstructions.findIndex((i) => i.moduleType === 'weather');

  if (weatherInst && prefetchedData['weather'] === undefined) {
    return {
      prefetchedData,
      claudeInstructions: moduleInstructions.filter((i) => i.moduleType !== 'weather'),
      // Marker payload — gets filtered out by stripErrorAndDuplicateSections
      // before render, so the user just sees no weather block at all rather
      // than a "Data unavailable" stub.
      weatherErrorSection: { type: 'weather', data: { error: true } } as unknown as GeneratedSection,
      weatherErrorIndex: weatherIdx,
    };
  }

  return {
    prefetchedData,
    claudeInstructions: moduleInstructions,
    weatherErrorSection: null,
    weatherErrorIndex: -1,
  };
}

/**
 * Splice the weather error section back into Claude's output at its original
 * position. Safe no-op when there's no error section. Note that the next
 * step in every caller is `stripErrorAndDuplicateSections`, which drops it
 * before rendering — splicing then stripping keeps the splice index logic
 * simple in case we ever want to keep error sections in some other surface.
 */
export function applyWeatherErrorSection(
  sections: GeneratedSection[],
  prep: BriefPrep
): GeneratedSection[] {
  if (!prep.weatherErrorSection) return sections;
  const clamped = Math.max(0, Math.min(prep.weatherErrorIndex, sections.length));
  const next = sections.slice();
  next.splice(clamped, 0, prep.weatherErrorSection);
  return next;
}

/**
 * Refine the news section in-place using the per-article URL validation
 * pipeline. Looks up the news instruction (topics, customQuery, sources,
 * excludeTopics), runs refineNewsSection, and replaces the section data.
 * Mirrors the runPipeline behavior so test-send / resend / preview routes
 * benefit from the same URL accuracy guarantees.
 *
 * Returns the extra Claude tokens consumed by the refinement so the caller
 * can roll them into its tokensUsed counter.
 */
export async function refineNewsInSections(
  sections: GeneratedSection[],
  instructions: ModuleSearchInstruction[],
): Promise<{ sections: GeneratedSection[]; extraTokens: number }> {
  const newsIdx = sections.findIndex((s) => s.type === 'news');
  if (newsIdx === -1) return { sections, extraTokens: 0 };

  const newsInst = instructions.find((m) => m.moduleType === 'news');
  const requestedCount = 3;
  const topics = (newsInst?.config.topics as string[] | undefined) ?? [];
  const customQuery = newsInst?.config.customQuery as string | undefined;
  const sources = newsInst?.config.sources as string[] | undefined;
  const excludeTopics = newsInst?.config.excludeTopics as string | undefined;

  try {
    const refinement = await refineNewsSection({
      rawSectionData: sections[newsIdx].data,
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
    const next = sections.slice();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (next[newsIdx] as any) = { type: 'news', data: refinedData };
    return { sections: next, extraTokens: refinement.retryTokens };
  } catch (err) {
    console.error('[briefPrep] News refinement failed (non-fatal, using raw output):', err);
    return { sections, extraTokens: 0 };
  }
}

/**
 * Final pre-render pass: drop sections whose payload is `{ error: true }`
 * and dedupe by module type (keeping the first occurrence). Used by every
 * brief-generation path that doesn't go through runPipeline's own merge
 * (test-send, resend, preview-html, generate-preview, cron/test).
 */
export function stripErrorAndDuplicateSections(sections: GeneratedSection[]): GeneratedSection[] {
  const seen = new Set<string>();
  const out: GeneratedSection[] = [];
  for (const s of sections) {
    if (isErrorPayload(s.data)) {
      console.warn(`[briefPrep] omitting ${s.type} from email — error payload`);
      continue;
    }
    if (seen.has(s.type)) {
      console.warn(`[briefPrep] omitting duplicate ${s.type} section`);
      continue;
    }
    seen.add(s.type);
    out.push(s);
  }
  return out;
}
