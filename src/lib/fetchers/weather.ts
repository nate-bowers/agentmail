interface WeatherLocation {
  name: string;
  tempF: number;
  condition: string;
  humidity: string;
  high: number;
  low: number;
}

export async function fetchWeather(
  locations: string[]
): Promise<{ locations: WeatherLocation[] } | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn('[Fetcher:weather] OPENWEATHER_API_KEY not set — falling back to Claude search');
    return null;
  }

  const results = await Promise.allSettled(
    locations.map(async (location): Promise<WeatherLocation> => {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=imperial`,
        { next: { revalidate: 0 } }
      );
      if (!res.ok) throw new Error(`OpenWeatherMap ${res.status} for "${location}"`);
      const d = await res.json();
      const raw = d.weather?.[0]?.description ?? 'unknown';
      const condition = raw.split(' ').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ');
      return {
        name: location,
        tempF: Math.round(d.main.temp),
        condition,
        humidity: `${d.main.humidity}%`,
        high: Math.round(d.main.temp_max),
        low: Math.round(d.main.temp_min),
      };
    })
  );

  const fulfilled = results
    .filter((r): r is PromiseFulfilledResult<WeatherLocation> => r.status === 'fulfilled')
    .map((r) => r.value);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[Fetcher:weather] Failed for "${locations[i]}":`, r.reason);
    }
  });

  return fulfilled.length > 0 ? { locations: fulfilled } : null;
}
