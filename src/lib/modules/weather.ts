import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  locations: z
    .array(z.string().min(1))
    .min(1, 'Add at least one location')
    .max(5, 'Maximum 5 locations'),
});

type WeatherConfig = z.infer<typeof configSchema>;

export const weatherModule: ModuleDefinition<typeof configSchema> = {
  type: 'weather',
  label: 'Weather',
  description: 'Current conditions and today\'s forecast for one or more cities.',
  icon: 'Cloud',
  defaultConfig: {
    locations: ['New York, NY'],
  } satisfies WeatherConfig,
  configSchema,
  buildSearchInstruction(config) {
    const locationList = config.locations.join(' and ');
    return (
      `Search for the current weather in each of these locations: ${locationList}. ` +
      `For each location return: temperature in Fahrenheit, current conditions (e.g. sunny, cloudy, rainy), ` +
      `humidity percentage, and today's high and low temperatures.`
    );
  },
};
