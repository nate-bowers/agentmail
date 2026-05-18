// Open-Meteo geocoding helpers for the weather module.
//
// All weather locations are geocoded at save time so the email render path
// can use real lat/lng and timezone instead of feeding a freeform city string
// into a search step. Open-Meteo's geocoder is free and key-less.

import { z } from 'zod';

const GEOCODE_BASE = 'https://geocoding-api.open-meteo.com/v1/search';

// The canonical shape stored in modules.config.locations[].
export const weatherLocationSchema = z.object({
  input: z.string().min(1).max(80),
  display_name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1).max(100),
  country_code: z.string().max(8).optional(),
});

export type WeatherLocationConfig = z.infer<typeof weatherLocationSchema>;

interface OMResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
}
interface OMResponse {
  results?: OMResult[];
}

function buildDisplayName(r: OMResult): string {
  // "Roseville, California, United States". Skip duplicates and empties.
  const parts = [r.name, r.admin1, r.country].filter(
    (p, i, arr) => p && arr.indexOf(p) === i
  );
  return parts.join(', ');
}

// US state abbreviations and a small set of common 2-letter region codes that
// users type after a comma (e.g. "Roseville, CA", "Berlin, DE"). Used to
// disambiguate when the city name alone has multiple matches across countries.
const US_STATE_ABBR = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);
const US_STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC',
};

// Parse the user's freeform input into a city and an optional region hint.
// Examples:
//   "Roseville, CA"             → { city: "Roseville", regionHint: "CA" }
//   "Paris, France"             → { city: "Paris", regionHint: "France" }
//   "New York City"             → { city: "New York City" }
//   "London"                    → { city: "London" }
function parseLocationInput(input: string): { city: string; regionHint?: string } {
  const [first, ...rest] = input.split(',').map((s) => s.trim()).filter(Boolean);
  if (!first) return { city: input.trim() };
  const regionHint = rest.length ? rest.join(', ') : undefined;
  return { city: first, regionHint };
}

// Score how well an Open-Meteo result matches the user's region hint. Higher
// is better. Used to pick the right "Paris" or "Roseville" out of many.
function scoreResult(r: OMResult, regionHint: string | undefined): number {
  if (!regionHint) return 0;
  const hint = regionHint.trim();
  const hintLower = hint.toLowerCase();

  let score = 0;
  if (r.admin1 && r.admin1.toLowerCase() === hintLower) score += 100;
  if (r.country && r.country.toLowerCase() === hintLower) score += 100;
  if (r.country_code && r.country_code.toLowerCase() === hintLower) score += 50;

  // US state abbreviation match
  if (hint.length === 2 && US_STATE_ABBR.has(hint.toUpperCase())) {
    if (r.country_code === 'US' && r.admin1) {
      const abbr = US_STATE_NAME_TO_ABBR[r.admin1.toLowerCase()];
      if (abbr === hint.toUpperCase()) score += 100;
    }
  }
  // Full US state name written out
  const abbrFromName = US_STATE_NAME_TO_ABBR[hintLower];
  if (abbrFromName && r.country_code === 'US' && r.admin1 && US_STATE_NAME_TO_ABBR[r.admin1.toLowerCase()] === abbrFromName) {
    score += 100;
  }
  return score;
}

async function searchGeocoder(name: string): Promise<OMResult[]> {
  const url = `${GEOCODE_BASE}?name=${encodeURIComponent(name)}&count=10&language=en&format=json`;
  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.warn('[weatherGeocode] fetch failed for', name, err);
    return [];
  }
  if (!res.ok) {
    console.warn('[weatherGeocode] non-OK status', res.status, 'for', name);
    return [];
  }
  const data = (await res.json()) as OMResponse;
  return data.results ?? [];
}

export async function geocodeLocation(
  input: string
): Promise<WeatherLocationConfig | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Open-Meteo's geocoder takes a single name and does not handle the natural
  // "City, ST" format users type. We parse the input into city + region hint,
  // query by city alone, then score candidates against the hint.
  const { city, regionHint } = parseLocationInput(trimmed);

  let results = await searchGeocoder(city);
  // Final fallback: search the entire raw input once in case Open-Meteo can
  // resolve it. Useful for names containing prepositions ("Frankfurt am Main").
  if (results.length === 0 && city !== trimmed) {
    results = await searchGeocoder(trimmed);
  }
  if (results.length === 0) return null;

  let top: OMResult = results[0];
  if (regionHint) {
    let bestScore = scoreResult(top, regionHint);
    for (const r of results.slice(1)) {
      const s = scoreResult(r, regionHint);
      if (s > bestScore) {
        bestScore = s;
        top = r;
      }
    }
  }
  if (!top.timezone) return null;

  return {
    input: trimmed,
    display_name: buildDisplayName(top),
    latitude: top.latitude,
    longitude: top.longitude,
    timezone: top.timezone,
    country_code: top.country_code,
  };
}

/**
 * Normalize a raw `locations` array (which may contain strings or already
 * geocoded objects) into the canonical `WeatherLocationConfig[]` shape.
 *
 * Returns `{ ok: false, failedInput }` on the first failure so the caller
 * can surface a precise 422 to the user identifying which entry to fix.
 */
export async function normalizeWeatherLocations(
  raw: unknown
): Promise<
  | { ok: true; locations: WeatherLocationConfig[] }
  | { ok: false; failedInput: string; reason: 'no_results' | 'invalid_shape' }
> {
  if (!Array.isArray(raw)) {
    return { ok: false, failedInput: '', reason: 'invalid_shape' };
  }

  const out: WeatherLocationConfig[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      const geocoded = await geocodeLocation(entry);
      if (!geocoded) {
        return { ok: false, failedInput: entry, reason: 'no_results' };
      }
      out.push(geocoded);
      continue;
    }
    if (entry && typeof entry === 'object') {
      // Already-geocoded object: re-validate but accept as-is when good.
      // If it has only `input` and is missing geocoded fields, re-geocode it.
      const parsed = weatherLocationSchema.safeParse(entry);
      if (parsed.success) {
        out.push(parsed.data);
        continue;
      }
      const candidateInput = (entry as { input?: unknown }).input;
      if (typeof candidateInput === 'string' && candidateInput.trim()) {
        const geocoded = await geocodeLocation(candidateInput);
        if (!geocoded) {
          return { ok: false, failedInput: candidateInput, reason: 'no_results' };
        }
        out.push(geocoded);
        continue;
      }
      return {
        ok: false,
        failedInput: candidateInput ? String(candidateInput) : '',
        reason: 'invalid_shape',
      };
    }
    return { ok: false, failedInput: String(entry), reason: 'invalid_shape' };
  }

  return { ok: true, locations: out };
}

/**
 * Friendly 422-style error copy when normalization fails.
 */
export function geocodeFailureMessage(failedInput: string): string {
  if (!failedInput) {
    return "We couldn't read your weather location. Please re-enter it.";
  }
  return `We couldn't find "${failedInput}". Try including the state or country, like "Roseville, California".`;
}
