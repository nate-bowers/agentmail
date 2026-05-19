import Anthropic from '@anthropic-ai/sdk';
import { getTheme } from '@/lib/email/themes';
import { stripDashesDeep } from '@/lib/email/dashStripper';
import type { ModuleSearchInstruction } from '@/types';

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ─────────────────────────────────────────────────────────────
// JSON shape Claude must return
// ─────────────────────────────────────────────────────────────

export interface GeneratedBrief {
  intro: string;
  sections: GeneratedSection[];
}

export type GeneratedSection =
  | { type: 'weather'; data: { locations: { name: string; tempF: number; condition: string; humidity: string; high: number; low: number }[] } }
  | { type: 'news'; data: { articles: { headline: string; source: string; summary: string; whyItMatters?: string; url?: string }[]; editorialNote?: string } }
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
  if (first === -1) {
    console.error('[Generate] No opening brace found. Response:', cleaned.slice(0, 200));
    throw new Error(`No JSON object found in response.`);
  }

  // Walk forward from the first { using bracket depth to find the matching }
  let depth = 0;
  let inString = false;
  let escaped = false;
  let last = -1;

  for (let i = first; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { last = i; break; }
    }
  }

  if (last === -1) {
    console.error('[Generate] JSON object is not closed. Partial response:', cleaned.slice(first, first + 300));
    throw new Error(`JSON object is not properly closed — response may be truncated.`);
  }

  return cleaned.slice(first, last + 1);
}

// ─────────────────────────────────────────────────────────────
// Schema description — only includes modules the user actually has
// ─────────────────────────────────────────────────────────────

const SCHEMA_MAP: Record<string, string> = {
  weather: `weather: { "locations": [{ "name": string, "tempF": number, "condition": string, "humidity": string, "high": number, "low": number }] }`,
  news: `news: { "articles": [{ "headline": string, "source": string, "summary": string, "whyItMatters": string, "url"?: string }] }`,
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
  user: { full_name?: string | null; email: string; email_theme?: string; email_verbosity?: string | null },
  instructions: ModuleSearchInstruction[],
  prefetchedData: Record<string, unknown> = {},
): string {
  const firstName = (user.full_name ?? user.email).split(' ')[0];
  const theme = getTheme(user.email_theme ?? 'light');
  const { includeCommentary } = theme.prose;
  const verbosity = (user.email_verbosity as string | null | undefined) ?? 'medium';

  const isSuccinct = verbosity === 'short' || verbosity === 'succinct';
  const isWordy = verbosity === 'long' || verbosity === 'wordy';

  const verbosityDirective = isSuccinct
    ? 'Extremely concise — one sentence per summary, no commentary.'
    : isWordy
      ? 'Thorough — 3-4 sentence summaries, rich context.'
      : 'Moderate — 2 sentence summaries.';

  const itemLimitsDirective = isSuccinct
    ? `Item limits (strictly enforce): news ≤ 3, ai_tech ≤ 3, reddit ≤ 2, sports.results ≤ 2, markets.symbols ≤ 3, weather.locations ≤ 2, recipe.ingredients ≤ 6, recipe.steps ≤ 4, workout.warmup ≤ 3, workout.circuit ≤ 4, local_events.events ≤ 2, week_history.events ≤ 2.`
    : '';

  const commentaryDirective = includeCommentary
    ? 'Add brief editorial commentary connecting data points where relevant.'
    : '';

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const sectionOrder = instructions.map((i) => i.moduleType).join(', ');

  const instructionBlock = instructions
    .map((inst, i) => {
      const prefetched = prefetchedData[inst.moduleType];
      if (prefetched !== undefined) {
        // For on_this_day/week_history, raw Wikipedia events need Claude to pick & format.
        // For weather/markets/currency, data is already in the final shape.
        const isHistoryModule = inst.moduleType === 'on_this_day' || inst.moduleType === 'week_history';
        if (isHistoryModule) {
          return `SECTION ${i + 1} (${inst.moduleType}) ⚠ STATIC — pre-fetched Wikipedia events:
Pick the best match for: ${inst.searchInstruction}
${JSON.stringify(prefetched)}`;
        }
        return `SECTION ${i + 1} (${inst.moduleType}) ⚠ STATIC — pre-fetched, do not alter values:
${JSON.stringify(prefetched)}`;
      }
      const marker = NO_SEARCH_MODULES.has(inst.moduleType) ? '⚠ STATIC' : '✓ LIVE';
      return `SECTION ${i + 1} (${inst.moduleType}) ${marker}:\n${inst.searchInstruction}`;
    })
    .join('\n\n');

  return `OUTPUT FORMAT:
Respond with ONLY a valid JSON object — no text before or after, no markdown fences, no comments.
Set "intro" to "". Never omit a section; use placeholder data if real data is unavailable.
${itemLimitsDirective}

USER:
Name: ${firstName}
Date: ${date}
Style: ${verbosityDirective}${commentaryDirective ? ` ${commentaryDirective}` : ''}

SEARCH RULES:
✓ LIVE — run one web_search. Run a second only if the first returned nothing useful.
⚠ STATIC — do not search; generate from training knowledge.

SECTIONS:
${instructionBlock}

SCHEMA (sections: ${sectionOrder}):
${buildSchemaDescription(instructions)}

RESPOND WITH:
{
  "intro": "",
  "sections": [
    ${instructions.map((m) => `{ "type": "${m.moduleType}", "data": { ... } }`).join(',\n    ')}
  ]
}
Exact order: ${sectionOrder}. Missing strings → "Unavailable", missing numbers → 0.
"direction": "up"|"down"|"flat". Sports "result": "win"|"loss"|"draw".

HARD STYLE RULES (apply to every text field in every section):
- Do not use em dashes (—) or en dashes (–) anywhere. Use commas, semicolons, periods, or restructure the sentence.
- Do not use citation markers ([1], [2], <cite>, etc.).
- Do not start sentences with "Did you know" or "Reportedly".`;
}

// ─────────────────────────────────────────────────────────────
// HTML entity decoder — strips encoded entities Claude sometimes emits
// ─────────────────────────────────────────────────────────────

function decodeHtmlEntities(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(+n))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  }
  if (Array.isArray(obj)) return obj.map(decodeHtmlEntities);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, decodeHtmlEntities(v)])
    );
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────
// Main generation function
// ─────────────────────────────────────────────────────────────

export async function generateDailyBrief(
  user: { id?: string; email: string; full_name?: string | null; email_theme?: string; email_verbosity?: string | null },
  moduleInstructions: ModuleSearchInstruction[],
  prefetchedData: Record<string, unknown> = {},
): Promise<GenerateResult> {
  if (moduleInstructions.length === 0) {
    throw new Error('[Generate] No module instructions provided — cannot generate brief.');
  }

  const moduleList = moduleInstructions.map((i) => i.moduleType).join(', ');
  const verbosity = user.email_verbosity ?? 'medium';
  console.log(`[Generate] Starting for ${user.email} | modules: ${moduleList} | theme: ${user.email_theme ?? 'light'} | verbosity: ${verbosity}`);

  const prompt = buildPrompt(user, moduleInstructions, prefetchedData);
  console.log('[Generate] Prompt being sent to Claude (first 800 chars):', prompt.slice(0, 800));

  const maxTokens = verbosity === 'succinct' ? 6000 : verbosity === 'wordy' ? 10000 : 8000;

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
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
    const rawParsed = decodeHtmlEntities(JSON.parse(cleaned));
    // Em/en-dash stripper. Hard brand rule that Claude ignores about half
    // the time. We always run the stripper and log replacements so we can
    // tell if prompt instructions are degrading.
    const dashResult = stripDashesDeep(rawParsed);
    if (dashResult.replacements > 0) {
      console.warn(`[Generate] Stripped ${dashResult.replacements} dash(es) from Claude output`);
    }
    parsed = dashResult.value as GeneratedBrief;
  } catch (parseErr) {
    console.error('[Generate] JSON.parse failed. Extracted slice (first 500):', cleaned.slice(0, 500));
    console.error('[Generate] JSON.parse failed. Extracted slice (last 300):', cleaned.slice(-300));
    console.error('[Generate] Parse error:', parseErr instanceof Error ? parseErr.message : parseErr);
    throw new Error('[Generate] Claude response was not valid JSON. See server logs for the raw response.');
  }

  return { intro: parsed.intro, sections: parsed.sections, tokensUsed };
}
