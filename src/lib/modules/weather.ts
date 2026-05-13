import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  locations: z
    .array(z.string().min(1))
    .min(1, 'Add at least one location')
    .max(5, 'Maximum 5 locations'),
  units: z.enum(['imperial', 'metric']).default('imperial'),
  extended: z.boolean().default(false),
});

export type WeatherConfig = z.infer<typeof configSchema>;

export const weatherModule: ModuleDefinition<typeof configSchema> = {
  type: 'weather',
  label: 'Weather',
  description: 'Current conditions and today\'s forecast for one or more cities.',
  icon: 'Cloud',
  defaultConfig: {
    locations: ['New York, NY'],
    units: 'imperial',
    extended: false,
  } satisfies WeatherConfig,
  configSchema,
  buildSearchInstruction(config) {
    const locationList = config.locations.join(' and ');
    const unitLabel = config.units === 'metric' ? 'Celsius' : 'Fahrenheit';
    const forecastType = config.extended
      ? 'current conditions plus a 5-day forecast'
      : 'current conditions and today\'s forecast';
    return (
      `Search for the current weather in each of these locations: ${locationList}. ` +
      `Report temperatures in ${unitLabel}. Return ${forecastType} for each location: ` +
      `temperature, current conditions (e.g. sunny, cloudy, rainy), humidity percentage, ` +
      `and today's high and low temperatures.`
    );
  },
};
