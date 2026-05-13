// Wikipedia "On This Day" REST API — free, no key needed.
// Returns historical events for a given month/day across all years.
// We pass the raw events to Claude so it can apply the user's category/era filters.

interface RawEvent {
  year: string;
  title: string;
  summary: string;
}

async function fetchWikipediaEvents(): Promise<RawEvent[] | null> {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`,
      {
        headers: { 'User-Agent': 'DailyBriefApp/1.0 (https://dailybriefmail.com)' },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      console.error(`[Fetcher:history] Wikipedia API ${res.status}`);
      return null;
    }

    const data = await res.json();
    const events: RawEvent[] = (data.events ?? [])
      .filter((e: { pages?: unknown[] }) => e.pages && (e.pages as unknown[]).length > 0)
      .slice(0, 15) // cap to keep token cost low when passed to Claude
      .map((e: { year: number; text: string }) => ({
        year: String(e.year),
        title: e.text,
        summary: e.text, // Wikipedia "text" is already a concise description
      }));

    return events.length > 0 ? events : null;
  } catch (err) {
    console.error('[Fetcher:history] Error:', err);
    return null;
  }
}

// Cached list of today's Wikipedia events passed to Claude for on_this_day/week_history.
// Claude picks and formats the best match given the user's category/era config.
export async function fetchHistoryEvents(): Promise<{ events: RawEvent[] } | null> {
  const events = await fetchWikipediaEvents();
  return events ? { events } : null;
}
