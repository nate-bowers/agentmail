import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  category: z.enum(['any', 'science', 'politics', 'sports', 'arts', 'technology', 'exploration']).default('any'),
  era: z.enum(['any', 'ancient', 'medieval', 'modern', 'contemporary']).default('any'),
  regionFocus: z.string().max(80).optional(),
});

export type WeekHistoryConfig = z.infer<typeof configSchema>;

export const weekhistoryModule: ModuleDefinition<typeof configSchema> = {
  type: 'week_history',
  label: 'This Week in History',
  description: 'Remarkable things that happened this week across history.',
  icon: 'Landmark',
  defaultConfig: {
    category: 'any',
    era: 'any',
  } satisfies WeekHistoryConfig,
  configSchema,
  buildSearchInstruction(config) {
    let instruction =
      `Search for notable historical events that occurred during this week ` +
      `(within the past 7 days' dates) in history, across any year. ` +
      `Category filter: ${config.category}. Era filter: ${config.era}.`;
    if (config.regionFocus) {
      instruction += ` Prefer events related to: ${config.regionFocus}.`;
    }
    instruction +=
      ` Find 2 events — one well-known and one surprising or lesser-known. ` +
      `For each: the year, a headline-style event title, and 2-3 sentences of context on why it was significant. ` +
      `Prefer events that have interesting consequences or stories behind them, not just famous dates.`;
    return instruction;
  },
};
