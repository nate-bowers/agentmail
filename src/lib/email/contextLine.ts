import type { GeneratedSection } from './generate';

// Builds the optional one-line "situate the reader" peek under the masthead
// date. Priority:
//   1. Weather peek if the brief includes a weather section with a usable
//      first location: "Clear and 77° in New York."
//   2. Day-of-week framing for Monday / Wednesday (halfway) / Friday — short
//      editorial lines that need no Claude call.
//   3. Otherwise null (omit the line; better blank than generic).

interface WeatherLoc {
  name: string;
  tempF: number;
  condition: string;
}

function pickWeatherPeek(sections: GeneratedSection[]): string | null {
  const weather = sections.find((s) => s.type === 'weather');
  if (!weather) return null;
  const data = weather.data as { locations?: WeatherLoc[]; error?: boolean };
  if (data?.error) return null;
  const loc = data?.locations?.[0];
  if (!loc || typeof loc.tempF !== 'number' || !loc.name) return null;
  const condition = (loc.condition ?? '').trim();
  const cityShort = loc.name.split(',')[0].trim();
  if (condition) {
    return `${condition} and ${loc.tempF}° in ${cityShort}.`;
  }
  return `${loc.tempF}° in ${cityShort}.`;
}

function dayOfWeekFraming(now: Date, timezone: string): string | null {
  // Use Intl in the user's timezone to figure out their local weekday.
  let weekday: string;
  try {
    weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(now);
  } catch {
    weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  }
  switch (weekday) {
    case 'Monday':    return 'A fresh week.';
    case 'Wednesday': return 'Halfway through the week.';
    case 'Friday':    return 'Last weekday of the week.';
    case 'Sunday':    return 'Quiet start to the week.';
    default:          return null;
  }
}

export function buildContextLine(
  sections: GeneratedSection[],
  timezone: string,
  now: Date = new Date(),
): string | undefined {
  return pickWeatherPeek(sections) ?? dayOfWeekFraming(now, timezone) ?? undefined;
}
