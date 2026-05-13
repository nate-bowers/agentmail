import Anthropic from '@anthropic-ai/sdk';
import { buildSearchInstructions } from '@/lib/modules';
import { getTheme } from '@/lib/email/themes';
import type { ModuleRow, Profile } from '@/types';

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
  | { type: 'fact'; data: { fact: string; explanation: string; category: string } };

// ─────────────────────────────────────────────────────────────
// JSON extraction — handles fences and stray text
// ─────────────────────────────────────────────────────────────

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }

  return raw.trim();
}

// ─────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────

function buildPrompt(
  user: Pick<Profile, 'full_name' | 'email'>,
  instructions: { moduleType: string; searchInstruction: string }[],
  emailTheme: string
): string {
  const firstName = (user.full_name ?? user.email).split(' ')[0];
  const theme = getTheme(emailTheme);
  const { verbosity, includeIntro, includeCommentary } = theme.prose;

  const instructionBlock = instructions
    .map((inst, i) => `${i + 1}. [${inst.moduleType}] ${inst.searchInstruction}`)
    .join('\n');

  const sectionOrder = instructions.map((i) => i.moduleType).join(', ');

  const verbosityDirective =
    verbosity === 'short'
      ? 'Be concise. Summaries should be 1 sentence max. Omit explanations unless essential.'
      : verbosity === 'long'
        ? 'Be thorough. Include context, nuance, and additional detail in summaries. Write 3-4 sentences per item where appropriate.'
        : 'Be balanced. 2 sentences per summary is ideal.';

  const introDirective = includeIntro
    ? `After completing all searches, write a short personalized intro of 2–3 sentences addressed to ${firstName} by first name. The intro should briefly acknowledge the day ahead based on what you found in a warm, concise tone.`
    : `Set "intro" to an empty string "".`;

  const commentaryDirective = includeCommentary
    ? 'Where relevant, add brief editorial commentary connecting data points (e.g. why a market move matters, how today\'s word relates to current events).'
    : '';

  return `You are generating a personalized daily email brief for ${firstName}.

Complete all of the following tasks by using your web search tool. Search for each item in turn and gather the results before writing your response.

TASKS:
${instructionBlock}

${introDirective}

CRITICAL INSTRUCTIONS:
1. Your entire response MUST be a single valid JSON object. No text before or after the JSON.
2. Do NOT wrap your response in markdown code fences or backticks.
3. Every required field in the schema must be present. Use "Unavailable" for string fields you cannot fill, 0 for missing numbers.
4. Never omit a section that was requested — always include it even if data is limited.
5. For "direction" fields: only use "up", "down", or "flat". Never use other values.
6. For "result" fields in sports: only use "win", "loss", or "draw".

PROSE STYLE: ${verbosityDirective}${commentaryDirective ? `\n${commentaryDirective}` : ''}

Respond ONLY with valid JSON following this exact shape (only include sections for the modules listed above):
{
  "intro": "<2-3 sentence personalized intro, or empty string>",
  "sections": [
    { "type": "weather", "data": { "locations": [{ "name": "string", "tempF": 0, "condition": "string", "humidity": "string", "high": 0, "low": 0 }] } },
    { "type": "news", "data": { "articles": [{ "headline": "string", "source": "string", "summary": "string" }] } },
    { "type": "quote", "data": { "text": "string", "author": "string" } },
    { "type": "markets", "data": { "symbols": [{ "symbol": "string", "price": "string", "change": "string", "changePercent": "string", "direction": "up" }] } },
    { "type": "sports", "data": { "results": [{ "team": "string", "opponent": "string", "score": "string", "result": "win", "nextGame": "optional" }], "standingsNote": "optional" } },
    { "type": "word_of_day", "data": { "word": "string", "partOfSpeech": "string", "definition": "string", "etymology": "string", "exampleSentence": "string" } },
    { "type": "workout", "data": { "intro": "string", "warmup": [{ "exercise": "string", "duration": "string" }], "circuit": [{ "exercise": "string", "sets": "optional", "reps": "optional", "duration": "optional" }], "cooldown": "string" } },
    { "type": "mindfulness", "data": { "prompt": "string", "style": "string" } },
    { "type": "on_this_day", "data": { "year": "string", "title": "string", "context": "string" } },
    { "type": "currency", "data": { "base": "string", "rates": [{ "target": "string", "rate": "string", "direction": "up", "change": "optional" }] } },
    { "type": "podcast", "data": { "showName": "string", "episodeTitle": "string", "length": "string", "guest": "optional", "description": "string", "url": "optional" } },
    { "type": "fact", "data": { "fact": "string", "explanation": "string", "category": "string" } }
  ]
}

Only include sections for these modules: ${sectionOrder}. Sections must appear in that exact order.`;
}

// ─────────────────────────────────────────────────────────────
// Main generation function
// ─────────────────────────────────────────────────────────────

export interface GenerateResult {
  brief: GeneratedBrief;
  inputTokens: number;
  outputTokens: number;
}

export async function generateDailyBrief(
  user: Pick<Profile, 'full_name' | 'email'>,
  modules: ModuleRow[],
  emailTheme = 'light'
): Promise<GenerateResult> {
  const sorted = [...modules].sort((a, b) => a.display_order - b.display_order);
  const instructions = buildSearchInstructions(sorted);

  if (instructions.length === 0) {
    throw new Error('[generate] No valid modules found — cannot generate brief.');
  }

  const moduleList = instructions.map((i) => i.moduleType).join(', ');
  console.log(`[generate] Starting for ${user.email} at ${new Date().toISOString()} | modules: ${moduleList} | theme: ${emailTheme}`);

  const prompt = buildPrompt(user, instructions, emailTheme);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{ role: 'user', content: prompt }],
  });

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  console.log(`[generate] Done for ${user.email} | tokens: ${inputTokens} in / ${outputTokens} out`);

  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!rawText) {
    console.error('[generate] No text block in Claude response:', JSON.stringify(response.content));
    throw new Error('[generate] Claude returned no text content.');
  }

  const cleaned = extractJSON(rawText);

  let brief: GeneratedBrief;
  try {
    brief = JSON.parse(cleaned) as GeneratedBrief;
  } catch {
    console.error('[generate] Failed to parse Claude response as JSON:\n', rawText);
    throw new Error('[generate] Claude response was not valid JSON. See server logs for the raw response.');
  }

  return { brief, inputTokens, outputTokens };
}
