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

export async function prepareBriefBeforeClaude(
  moduleInstructions: ModuleSearchInstruction[]
): Promise<BriefPrep> {
  let prefetchedData: Record<string, unknown> = {};
  try {
    prefetchedData = await prefetchModuleData(moduleInstructions);
  } catch (err) {
    console.error('[briefPrep] Prefetch failed (non-fatal):', err);
  }

  const weatherInst = moduleInstructions.find((i) => i.moduleType === 'weather');
  const weatherIdx = moduleInstructions.findIndex((i) => i.moduleType === 'weather');

  if (weatherInst && prefetchedData['weather'] === undefined) {
    return {
      prefetchedData,
      claudeInstructions: moduleInstructions.filter((i) => i.moduleType !== 'weather'),
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
 * position. Safe no-op when there's no error section.
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
