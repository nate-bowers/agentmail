import { z } from 'zod';
import type { ModuleDefinition } from '@/types';
import { geocodedLocationSchema, type GeocodedLocation } from './weatherGeocode';

// city accepts either a freeform string (legacy / fresh form submits) or a
// fully geocoded object (post-save / backfilled). The POST/PATCH API route
// normalizes everything to the geocoded shape before persisting, so old rows
// with bare strings continue to validate without breaking.
export const configSchema = z.object({
  city: z.union([
    z.string().min(1, 'Enter a city').max(80, 'City name is too long'),
    geocodedLocationSchema,
  ]),
  categories: z.array(z.string().max(40, 'Category name is too long')).min(1, 'Select at least one category').max(5, 'Maximum 5 categories'),
  radius: z.enum(['walking', 'city', 'metro']).default('city'),
  customRequest: z.string().max(150).optional(),
});

export type EventsConfig = z.infer<typeof configSchema>;

function describeCity(city: EventsConfig['city']): string {
  if (typeof city === 'string') return city;
  return city.display_name;
}

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
    const cityLabel = describeCity(config.city);
    // When we have lat/lng we add them as a search-disambiguation hint so
    // Claude doesn't end up searching the wrong Springfield. Plain-text city
    // for the prose, coords for the search precision.
    const coordHint = typeof config.city !== 'string'
      ? ` (coordinates ${(config.city as GeocodedLocation).latitude.toFixed(4)}, ${(config.city as GeocodedLocation).longitude.toFixed(4)})`
      : '';
    const categoryStr = config.categories.join(', ');
    const radiusDetail =
      config.radius === 'walking'
        ? 'walking = within 1 mile'
        : config.radius === 'city'
          ? 'city = within the city limits'
          : 'metro = within 25 miles';
    let instruction =
      `Search for events happening today and in the next 3 days in ${cityLabel}${coordHint} ` +
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
