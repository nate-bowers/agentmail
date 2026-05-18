import { z } from 'zod';
import type { ModuleDefinition } from '@/types';
import { weatherLocationSchema } from './weatherGeocode';

// `locations` items can be the canonical geocoded shape OR a plain string at
// the boundary (form submits, onboarding, legacy rows). The API route always
// normalizes to the geocoded shape before persisting, but accepting both here
// keeps validation forgiving for existing rows.
export const configSchema = z.object({
  locations: z
    .array(z.union([z.string().min(1).max(80, 'Location name is too long'), weatherLocationSchema]))
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
  // Weather no longer goes through Claude. The brief pipeline pulls forecast
  // data directly from Open-Meteo using stored lat/lng/timezone. This stub
  // exists only because the ModuleDefinition contract requires it.
  buildSearchInstruction() {
    return '';
  },
};
