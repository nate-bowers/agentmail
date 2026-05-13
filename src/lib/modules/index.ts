import type { ModuleDefinition, ModuleRow, ModuleSearchInstruction } from '@/types';
import { sanitizeConfig } from '@/lib/security/sanitize';
import { weatherModule } from './weather';
import { newsModule } from './news';
import { quoteModule } from './quote';
import { marketsModule } from './markets';
import { sportsModule } from './sports';
import { wordModule } from './word';
import { workoutModule } from './workout';
import { mindfulnessModule } from './mindfulness';
import { onThisDayModule } from './onthisday';
import { currencyModule } from './currency';
import { podcastModule } from './podcast';
import { factModule } from './fact';
import { recipeModule } from './recipe';
import { aitechModule } from './aitech';
import { bookModule } from './book';
import { redditModule } from './reddit';
import { eventsModule } from './events';
import { horoscopeModule } from './horoscope';
import { languageModule } from './language';
import { affirmationModule } from './affirmation';
import { weekhistoryModule } from './weekhistory';
import { challengeModule } from './challenge';

// ─────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MODULE_REGISTRY: Record<string, ModuleDefinition<any>> = {
  [weatherModule.type]: weatherModule,
  [newsModule.type]: newsModule,
  [quoteModule.type]: quoteModule,
  [marketsModule.type]: marketsModule,
  [sportsModule.type]: sportsModule,
  [wordModule.type]: wordModule,
  [workoutModule.type]: workoutModule,
  [mindfulnessModule.type]: mindfulnessModule,
  [onThisDayModule.type]: onThisDayModule,
  [currencyModule.type]: currencyModule,
  [podcastModule.type]: podcastModule,
  [factModule.type]: factModule,
  [recipeModule.type]: recipeModule,
  [aitechModule.type]: aitechModule,
  [bookModule.type]: bookModule,
  [redditModule.type]: redditModule,
  [eventsModule.type]: eventsModule,
  [horoscopeModule.type]: horoscopeModule,
  [languageModule.type]: languageModule,
  [affirmationModule.type]: affirmationModule,
  [weekhistoryModule.type]: weekhistoryModule,
  [challengeModule.type]: challengeModule,
};

// ─────────────────────────────────────────────────────────────
// Display order for the module picker UI
// ─────────────────────────────────────────────────────────────

export const MODULE_DISPLAY_ORDER = [
  'weather', 'news', 'quote', 'markets', 'sports',
  'fact', 'on_this_day', 'word_of_day', 'mindfulness',
  'workout', 'currency', 'podcast',
  'recipe', 'ai_tech', 'book', 'reddit', 'local_events',
  'horoscope', 'language', 'affirmation', 'week_history', 'challenge',
];

export const POPULAR_MODULE_TYPES = new Set([
  'weather', 'news', 'quote', 'markets', 'sports', 'recipe', 'ai_tech',
]);

export const NEW_MODULE_TYPES = new Set([
  'fact', 'on_this_day', 'word_of_day', 'mindfulness', 'workout', 'currency', 'podcast',
  'recipe', 'ai_tech', 'book', 'reddit', 'local_events',
  'horoscope', 'language', 'affirmation', 'week_history', 'challenge',
]);

// ─────────────────────────────────────────────────────────────
// buildSearchInstructions
// ─────────────────────────────────────────────────────────────

/**
 * Converts an array of enabled user module rows into search instructions
 * ready to be passed to the Claude generation step.
 */
export function buildSearchInstructions(
  modules: ModuleRow[]
): ModuleSearchInstruction[] {
  const instructions: ModuleSearchInstruction[] = [];

  for (const row of modules) {
    const definition = MODULE_REGISTRY[row.module_type];

    if (!definition) {
      console.warn(`[modules] Unknown module_type "${row.module_type}" — skipping.`);
      continue;
    }

    const parsed = definition.configSchema.safeParse(row.config);

    if (!parsed.success) {
      console.error(
        `[modules] Invalid config for module ${row.id} (${row.module_type}):`,
        parsed.error.flatten()
      );
      continue;
    }

    const sanitizedConfig = sanitizeConfig(parsed.data as Record<string, unknown>);

    instructions.push({
      moduleType: row.module_type,
      config: sanitizedConfig,
      searchInstruction: definition.buildSearchInstruction(sanitizedConfig),
    });
  }

  return instructions;
}
