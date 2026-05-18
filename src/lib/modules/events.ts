import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  city: z.string().min(1, 'Enter a city').max(80, 'City name is too long'),
  categories: z.array(z.string().max(40, 'Category name is too long')).min(1, 'Select at least one category').max(5, 'Maximum 5 categories'),
  radius: z.enum(['walking', 'city', 'metro']).default('city'),
  customRequest: z.string().max(150).optional(),
});

export type EventsConfig = z.infer<typeof configSchema>;

export const eventsModule: ModuleDefinition<typeof configSchema> = {
  type: 'local_events',
  label: 'Local Events',
  description: 'What\'s happening in your city today and this week.',
  icon: 'MapPin',
  defaultConfig: {
    city: '',
    categories: ['music', 'food & drink'],
    radius: 'city',
  } satisfies EventsConfig,
  configSchema,
  buildSearchInstruction(config) {
    const categoryStr = config.categories.join(', ');
    const radiusDetail =
      config.radius === 'walking'
        ? 'walking = within 1 mile'
        : config.radius === 'city'
          ? 'city = within the city limits'
          : 'metro = within 25 miles';
    let instruction =
      `Search for events happening today and in the next 3 days in ${config.city} ` +
      `(radius: ${config.radius} — ${radiusDetail}). ` +
      `Categories of interest: ${categoryStr}.`;
    if (config.customRequest) {
      instruction += ` ${config.customRequest}.`;
    }
    instruction +=
      ` Return 3-4 events. For each: event name, date and time, venue name and neighborhood, ` +
      `a one-sentence description, approximate price or free, and a URL or where to find tickets if available. ` +
      `Prefer events that are actually interesting and worth attending, not generic recurring meetups.`;
    return instruction;
  },
};
