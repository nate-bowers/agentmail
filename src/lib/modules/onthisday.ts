import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  category: z.enum(['any', 'science', 'politics', 'sports', 'arts', 'technology']),
  regionFocus: z.string().max(80).optional(),
});

type OnThisDayConfig = z.infer<typeof configSchema>;

export const onThisDayModule: ModuleDefinition<typeof configSchema> = {
  type: 'on_this_day',
  label: 'On This Day',
  description: "A fascinating historical event that happened on today's date.",
  icon: 'Calendar',
  defaultConfig: {
    category: 'any',
  } satisfies OnThisDayConfig,
  configSchema,
  buildSearchInstruction(config) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const categoryStr = config.category === 'any' ? 'any category' : config.category;
    let instruction =
      `Search for notable historical events that occurred on ${dateStr} in history, ` +
      `filtered to the category: ${categoryStr}. Pick the single most interesting or surprising ` +
      `event. Return: the year it occurred, a headline-style title for the event, and 2-3 sentences ` +
      `of context explaining why it matters or what made it remarkable. Avoid extremely well-known ` +
      `events like moon landings or world wars unless nothing better exists for the category.`;
    if (config.regionFocus) {
      instruction += ` Prefer events related to: ${config.regionFocus}.`;
    }
    return instruction;
  },
};
