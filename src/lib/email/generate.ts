import Anthropic from '@anthropic-ai/sdk';
import { getTheme } from '@/lib/email/themes';
import type { ModuleSearchInstruction } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────
// JSON shape Claude must return
// ─────────────────────────────────────────────────────────────

export interface GeneratedBrief {
  intro: string;
  sections: GeneratedSection[];
}

export type GeneratedSection =
  | { type: 'weather'; data: { locations: { name: string; tempF: number; condition: string; humidity: string; high: number; low: number }[] } }
  | { type: 'news'; data: { articles: { headline: string; source: string; summary: string }[] } }
  | { type: 'quote'; data: { text: string; author: string } }
  | { type: 'markets'; data: { symbols: { symbol: string; price: string; change: string; changePercent: string; direction: 'up' | 'down' }[] } }
  | { type: 'sports'; data: { results: { team: string; opponent: string; score: string; result: 'win' | 'loss' | 'draw'; nextGame?: string }[]; standingsNote?: string } }
  | { type: 'word_of_day'; data: { word: string; partOfSpeech: string; definition: string; etymology: string; exampleSentence: string } }
  | { type: 'workout'; data: { intro: string; warmup: { exercise: string; duration: string }[]; circuit: { exercise: string; sets?: string; reps?: string; duration?: string }[]; cooldown: string } }
  | { type: 'mindfulness'; data: { prompt: string; style: string } }
  | { type: 'on_this_day'; data: { year: string; title: string; context: string } }
  | { type: 'currency'; data: { base: string; rates: { target: string; rate: string; direction: 'up' | 'down' | 'flat'; change?: string }[] } }
  | { type: 'podcast'; data: { showName: string; episodeTitle: string; length: string; guest?: string; description: string; url?: string } }
  | { type: 'fact'; data: { fact: string; explanation: string; category: string } }
  | { type: 'recipe'; data: { name: string; description: string; prepTime: string; cookTime: string; servings: string; ingredients: string[]; steps: string[] } }
  | { type: 'book'; data: { title: string; author: string; year: string; genre: string; pages: string; summary: string; perfectFor: string } }
  | { type: 'reddit'; data: { posts: { subreddit: string; title: string; summary: string; upvotes: string; url: string }[] } }
  | { type: 'horoscope'; data: { sign: string; symbol: string; reading: string; focusForToday: string } }
  | { type: 'language'; data: { language: string; word: string; romanization?: string; partOfSpeech: string; translation: string; memoryTip: string; exampleOriginal: string; exampleTranslation: string } }
  | { type: 'affirmation'; data: { text: string; focus: string } }
  | { type: 'ai_tech'; data: { stories: { headline: string; source: string; summary: string }[] } }
  | { type: 'local_events'; data: { city: string; events: { name: string; datetime: string; venue: string; description: string; price: string; url?: string }[] } }
  | { type: 'week_history'; data: { events: { year: string; title: string; context: string }[] } }
  | { type: 'challenge'; data: { type: string; title: string; description: string; whyItMatters: string } };

export interface GenerateResult {
  intro: string;
  sections: GeneratedSection[];
  tokensUsed: number;
}

// ─────────────────────────────────────────────────────────────
// JSON extraction — handles fences and stray text
// ─────────────────────────────────────────────────────────────

function extractJSON(raw: string): string {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');

  if (first === -1 || last === -1 || last <= first) {
    console.error('[Generate] Could not find JSON in response:', cleaned);
    throw new Error(`No valid JSON object found. Response started with: ${cleaned.slice(0, 100)}`);
  }

  return cleaned.slice(first, last + 1);
}

// ─────────────────────────────────────────────────────────────
// Schema description — only includes modules the user actually has
// ─────────────────────────────────────────────────────────────

const SCHEMA_MAP: Record<string, string> = {
  weather: `weather: { "locations": [{ "name": string, "tempF": number, "condition": string, "humidity": string, "high": number, "low": number }] }`,
  news: `news: { "articles": [{ "headline": string, "source": string, "summary": string }] }`,
  quote: `quote: { "text": string, "author": string }`,
  markets: `markets: { "symbols": [{ "symbol": string, "price": string, "change": string, "changePercent": string, "direction": "up"|"down" }] }`,
  sports: `sports: { "results": [{ "team": string, "opponent": string, "score": string, "result": "win"|"loss"|"draw", "nextGame"?: string }], "standingsNote"?: string }`,
  word_of_day: `word_of_day: { "word": string, "partOfSpeech": string, "definition": string, "etymology": string, "exampleSentence": string }`,
  workout: `workout: { "intro": string, "warmup": [{ "exercise": string, "duration": string }], "circuit": [{ "exercise": string, "sets"?: string, "reps"?: string, "duration"?: string }], "cooldown": string }`,
  mindfulness: `mindfulness: { "prompt": string, "style": string }`,
  on_this_day: `on_this_day: { "year": string, "title": string, "context": string }`,
  currency: `currency: { "base": string, "rates": [{ "target": string, "rate": string, "direction": "up"|"down"|"flat" }] }`,
  podcast: `podcast: { "showName": string, "episodeTitle": string, "length": string, "guest"?: string, "description": string, "url"?: string }`,
  fact: `fact: { "fact": string, "explanation": string, "category": string }`,
  recipe: `recipe: { "name": string, "description": string, "prepTime": string, "cookTime": string, "servings": string, "ingredients": string[], "steps": string[] }`,
  book: `book: { "title": string, "author": string, "year": string, "genre": string, "pages": string, "summary": string, "perfectFor": string }`,
  reddit: `reddit: { "posts": [{ "subreddit": string, "title": string, "summary": string, "upvotes": string, "url": string }] }`,
  horoscope: `horoscope: { "sign": string, "symbol": string, "reading": string, "focusForToday": string }`,
  language: `language: { "language": string, "word": string, "romanization"?: string, "partOfSpeech": string, "translation": string, "memoryTip": string, "exampleOriginal": string, "exampleTranslation": string }`,
  affirmation: `affirmation: { "text": string, "focus": string }`,
  ai_tech: `ai_tech: { "stories": [{ "headline": string, "source": string, "summary": string }] }`,
  local_events: `local_events: { "city": string, "events": [{ "name": string, "datetime": string, "venue": string, "description": string, "price": string, "url"?: string }] }`,
  week_history: `week_history: { "events": [{ "year": string, "title": string, "context": string }] }`,
  challenge: `challenge: { "type": string, "title": string, "description": string, "whyItMatters": string }`,
};

function buildSchemaDescription(instructions: ModuleSearchInstruction[]): string {
  return instructions
    .map((m) => SCHEMA_MAP[m.moduleType] ?? `${m.moduleType}: { "data": {} }`)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────
// Search policy — modules that never need real-time data
// ─────────────────────────────────────────────────────────────

const NO_SEARCH_MODULES = new Set([
  'quote', 'fact', 'affirmation', 'mindfulness', 'recipe',
  'book', 'challenge', 'language', 'word_of_day', 'horoscope',
  'workout', 'on_this_day',
]);

// ─────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────

function buildPrompt(
  user: { full_name?: string | null; email: string; email_theme?: string },
  instructions: ModuleSearchInstruction[],
  prefetchedData: Record<string, unknown> = {},
): string {
  const firstName = (user.full_name ?? user.email).split(' ')[0];
  const theme = getTheme(user.email_theme ?? 'light');
  const { verbosity, includeIntro, includeCommentary } = theme.prose;

  const instructionBlock = instructions
    .map((inst, i) => {
      const prefetched = prefetchedData[inst.moduleType];
      if (prefetched !== undefined) {
        // For on_this_day/week_history, raw Wikipedia events need Claude to pick & format.
        // For weather/markets/currency, data is already in the final shape.
        const isHistoryModule = inst.moduleType === 'on_this_day' || inst.moduleType === 'week_history';
        if (isHistoryModule) {
          return `SECTION ${i + 1} (${inst.moduleType}):
⚠ DO NOT use web_search. Use these pre-fetched Wikipedia events for today's date.
Pick the best match for the user's preferences (${inst.searchInstruction}).
Events available:
${JSON.stringify(prefetched)}`;
        }
        return `SECTION ${i + 1} (${inst.moduleType}):
⚠ DATA PRE-FETCHED — DO NOT use web_search.
Write this section using exactly this data (do not alter values):
${JSON.stringify(prefetched)}`;
      }
      const noSearch = NO_SEARCH_MODULES.has(inst.moduleType);
      const searchDirective = noSearch
        ? '⚠ DO NOT use web_search for this section. Generate entirely from your training knowledge.'
        : '✓ Use web_search to fetch current real-time data for this section. One search is usually enough.';
      return `SECTION ${i + 1} (${inst.moduleType}):\n${searchDirective}\n${inst.searchInstruction}`;
    })
    .join('\n\n');

  const sectionOrder = instructions.map((i) => i.moduleType).join(', ');

  const verbosityDirective =
    verbosity === 'short'
      ? 'Be extremely concise. One sentence per news summary. Skip commentary.'
      : verbosity === 'long'
        ? 'Be thorough. 3-4 sentence summaries. Rich context. Full paragraph intro.'
        : 'Be clear and moderately detailed. 2 sentence summaries. 2-3 sentence intro.';

  const introDirective = includeIntro
    ? `Write a warm, personalized 2-3 sentence intro addressing ${firstName} by first name. Reference something specific from today's content (a headline, the weather, the quote) to make it feel written, not templated. Do not start with "Good morning" — be more creative.`
    : `Set "intro" to an empty string "".`;

  const commentaryDirective = includeCommentary
    ? 'Where relevant, add brief editorial commentary connecting data points.'
    : '';

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return `CRITICAL INSTRUCTIONS:
You must respond with ONLY a valid JSON object.
Do not include any text before or after the JSON.
Do not use markdown code fences or backticks.
Do not include comments inside the JSON.
Every section listed below must appear in the sections array.
If you cannot find real data for a section, generate reasonable placeholder content — never omit a section.

SEARCH EFFICIENCY (important — minimize API cost):
- Sections marked ⚠ DO NOT use web_search — generate from training knowledge only.
- Sections marked ✓ require real-time data — search, but use the minimum searches needed.
- One search per real-time section is almost always sufficient. Do not run follow-up searches unless the first returned nothing useful.
- Never search for content you already know (quotes, recipes, word definitions, horoscopes, workout plans, etc.).

USER CONTEXT:
Name: ${firstName}
Date: ${date}
Prose style: ${verbosityDirective}${commentaryDirective ? `\n${commentaryDirective}` : ''}

INSTRUCTIONS FOR EACH SECTION:
${instructionBlock}

INTRO INSTRUCTION:
${introDirective}

SECTION DATA SHAPES (only include sections for: ${sectionOrder}):
${buildSchemaDescription(instructions)}

RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "intro": "string",
  "sections": [
    ${instructions.map((m) => `{ "type": "${m.moduleType}", "data": { ... } }`).join(',\n    ')}
  ]
}

Sections must appear in this exact order: ${sectionOrder}.
Use "Unavailable" for string fields you cannot fill, 0 for missing numbers.
For "direction" fields use only "up", "down", or "flat".
For sports "result" fields use only "win", "loss", or "draw".`;
}

// ─────────────────────────────────────────────────────────────
// Main generation function
// ─────────────────────────────────────────────────────────────

export async function generateDailyBrief(
  user: { id?: string; email: string; full_name?: string | null; email_theme?: string },
  moduleInstructions: ModuleSearchInstruction[],
  prefetchedData: Record<string, unknown> = {},
): Promise<GenerateResult> {
  if (moduleInstructions.length === 0) {
    throw new Error('[Generate] No module instructions provided — cannot generate brief.');
  }

  const moduleList = moduleInstructions.map((i) => i.moduleType).join(', ');
  console.log(`[Generate] Starting for ${user.email} | modules: ${moduleList} | theme: ${user.email_theme ?? 'light'}`);

  const prompt = buildPrompt(user, moduleInstructions, prefetchedData);
  console.log('[Generate] Prompt being sent to Claude (first 800 chars):', prompt.slice(0, 800));

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{ role: 'user', content: prompt }],
  });

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const tokensUsed = outputTokens;
  console.log(`[Generate] Done for ${user.email} | tokens: ${inputTokens} in / ${outputTokens} out`);

  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!rawText) {
    console.error('[Generate] No text blocks in response. Full response:', JSON.stringify(response.content, null, 2));
    throw new Error('Claude returned no text content. Check tool use blocks.');
  }

  console.log('[Generate] Raw Claude response (first 500 chars):', rawText.slice(0, 500));

  const cleaned = extractJSON(rawText);

  let parsed: GeneratedBrief;
  try {
    parsed = JSON.parse(cleaned) as GeneratedBrief;
  } catch {
    console.error('[Generate] Failed to parse Claude response as JSON:\n', rawText);
    throw new Error('[Generate] Claude response was not valid JSON. See server logs for the raw response.');
  }

  return { intro: parsed.intro, sections: parsed.sections, tokensUsed };
}
