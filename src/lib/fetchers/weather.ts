import type { WeatherLocationConfig } from '@/lib/modules/weatherGeocode';

// Public shape returned to the email render path. Matches what
// DailyBriefEmail.WeatherSection currently consumes; downstream code is
// unchanged.
export interface WeatherLocation {
  name: string;
  tempF: number;
  condition: string;
  humidity: string;
  high: number;
  low: number;
}

export type WeatherUnits = 'imperial' | 'metric';

// In-memory cache shared across cron-driven sends within a single warm
// function instance. 30-minute TTL is plenty for a daily brief and avoids
// repeated forecast calls when many users share the same lat/lng.
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

interface CacheEntry { value: WeatherLocation; expiresAt: number }
const cache = new Map<string, CacheEntry>();
function cacheKey(lat: number, lon: number, units: WeatherUnits) {
  return `${lat.toFixed(3)}:${lon.toFixed(3)}:${units}`;
}

interface OMForecastResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
  };
}

// WMO weather codes → human readable. Source: Open-Meteo docs.
// Mapping prioritizes "morning brief" clarity over meteorological precision.
function wmoToCondition(code: number | undefined): string {
  if (code === undefined) return 'Unknown';
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96 || code === 99) return 'Thunderstorm with Hail';
  return 'Unknown';
}

async function fetchOne(
  loc: WeatherLocationConfig,
  units: WeatherUnits
): Promise<WeatherLocation | null> {
  const key = cacheKey(loc.latitude, loc.longitude, units);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return { ...hit.value, name: loc.display_name };
  }

  const tempUnit = units === 'metric' ? 'celsius' : 'fahrenheit';
  const windUnit = units === 'metric' ? 'kmh' : 'mph';

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${loc.latitude}` +
    `&longitude=${loc.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
    `&temperature_unit=${tempUnit}` +
    `&wind_speed_unit=${windUnit}` +
    `&timezone=${encodeURIComponent(loc.timezone)}` +
    `&forecast_days=1`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    console.warn('[Fetcher:weather] fetch failed for', loc.display_name, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    console.warn('[Fetcher:weather] non-OK status', res.status, 'for', loc.display_name);
    return null;
  }

  const data = (await res.json()) as OMForecastResponse;

  const current = data.current;
  const daily = data.daily;
  if (!current || !daily?.temperature_2m_max?.length || !daily?.temperature_2m_min?.length) {
    console.warn('[Fetcher:weather] empty payload for', loc.display_name);
    return null;
  }

  const value: WeatherLocation = {
    name: loc.display_name,
    tempF: Math.round(current.temperature_2m ?? 0),
    condition: wmoToCondition(current.weather_code),
    humidity: `${Math.round(current.relative_humidity_2m ?? 0)}%`,
    high: Math.round(daily.temperature_2m_max[0] ?? 0),
    low: Math.round(daily.temperature_2m_min[0] ?? 0),
  };

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/**
 * Fetch today's weather for one or more geocoded locations via Open-Meteo.
 *
 * The user's stored IANA timezone (captured at geocode time) is passed
 * through so the "today's high" aggregation aligns with the user's local
 * day, not UTC. This is the fix for the "off by ~10 degrees" bug we were
 * seeing with the OpenWeatherMap current-weather endpoint.
 */
export async function fetchWeather(
  locations: WeatherLocationConfig[],
  units: WeatherUnits = 'imperial'
): Promise<{ locations: WeatherLocation[] } | null> {
  if (!locations.length) return null;

  const settled = await Promise.allSettled(
    locations.map((loc) => fetchOne(loc, units))
  );

  const fulfilled: WeatherLocation[] = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      fulfilled.push(r.value);
    } else if (r.status === 'rejected') {
      console.error('[Fetcher:weather] failed for', locations[i].display_name, r.reason);
    }
  });

  return fulfilled.length > 0 ? { locations: fulfilled } : null;
}
