import Anthropic from '@anthropic-ai/sdk';
import { buildSearchInstructions } from '@/lib/modules';
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
// Prompt builder
// ─────────────────────────────────────────────────────────────

function buildPrompt(
  user: Pick<Profile, 'full_name' | 'email'>,
  instructions: { moduleType: string; searchInstruction: string }[]
): string {
  const firstName = (user.full_name ?? user.email).split(' ')[0];

  const instructionBlock = instructions
    .map((inst, i) => `${i + 1}. [${inst.moduleType}] ${inst.searchInstruction}`)
    .join('\n');

  const sectionOrder = instructions.map((i) => i.moduleType).join(', ');

  return `You are generating a personalized daily email brief for ${firstName}.

Complete all of the following tasks by using your web search tool. Search for each item in turn and gather the results before writing your response.

TASKS:
${instructionBlock}

After completing all searches, write a short personalized intro of 2–3 sentences addressed to ${firstName} by first name. The intro should briefly acknowledge the day ahead based on what you found in a warm, concise tone.

Respond ONLY with valid JSON. No markdown fences, no backticks, no preamble, no trailing text — just the raw JSON object.

The JSON must follow this exact shape (only include sections for the modules listed above):
{
  "intro": "<2-3 sentence personalized intro>",
  "sections": [
    {
      "type": "weather",
      "data": { "locations": [{ "name": "string", "tempF": 0, "condition": "string", "humidity": "string", "high": 0, "low": 0 }] }
    },
    {
      "type": "news",
      "data": { "articles": [{ "headline": "string", "source": "string", "summary": "string" }] }
    },
    {
      "type": "quote",
      "data": { "text": "string", "author": "string" }
    },
    {
      "type": "markets",
      "data": { "symbols": [{ "symbol": "string", "price": "string", "change": "string", "changePercent": "string", "direction": "up" }] }
    },
    {
      "type": "sports",
      "data": {
        "results": [{ "team": "string", "opponent": "string", "score": "string", "result": "win", "nextGame": "optional string" }],
        "standingsNote": "optional string"
      }
    },
    {
      "type": "word_of_day",
      "data": { "word": "string", "partOfSpeech": "string", "definition": "string", "etymology": "string", "exampleSentence": "string" }
    },
    {
      "type": "workout",
      "data": {
        "intro": "string",
        "warmup": [{ "exercise": "string", "duration": "string" }],
        "circuit": [{ "exercise": "string", "sets": "optional", "reps": "optional", "duration": "optional" }],
        "cooldown": "string"
      }
    },
    {
      "type": "mindfulness",
      "data": { "prompt": "string", "style": "string" }
    },
    {
      "type": "on_this_day",
      "data": { "year": "string", "title": "string", "context": "string" }
    },
    {
      "type": "currency",
      "data": { "base": "string", "rates": [{ "target": "string", "rate": "string", "direction": "up", "change": "optional" }] }
    },
    {
      "type": "podcast",
      "data": { "showName": "string", "episodeTitle": "string", "length": "string", "guest": "optional", "description": "string", "url": "optional" }
    },
    {
      "type": "fact",
      "data": { "fact": "string", "explanation": "string", "category": "string" }
    }
  ]
}

Only include sections for the modules listed above. Sections must appear in this order: ${sectionOrder}.
Use the exact type strings shown. For markets and currency, "direction" must be "up", "down", or "flat" based on today's change. For sports, "result" must be "win", "loss", or "draw".`;
}

// ─────────────────────────────────────────────────────────────
// Main generation function
// ─────────────────────────────────────────────────────────────

export async function generateDailyBrief(
  user: Pick<Profile, 'full_name' | 'email'>,
  modules: ModuleRow[]
): Promise<GeneratedBrief> {
  const sorted = [...modules].sort((a, b) => a.display_order - b.display_order);
  const instructions = buildSearchInstructions(sorted);

  if (instructions.length === 0) {
    throw new Error('[generate] No valid modules found — cannot generate brief.');
  }

  const prompt = buildPrompt(user, instructions);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!rawText) {
    console.error('[generate] No text block in Claude response:', JSON.stringify(response.content));
    throw new Error('[generate] Claude returned no text content.');
  }

  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed: GeneratedBrief;
  try {
    parsed = JSON.parse(cleaned) as GeneratedBrief;
  } catch {
    console.error('[generate] Failed to parse Claude response as JSON:\n', rawText);
    throw new Error('[generate] Claude response was not valid JSON. See server logs for the raw response.');
  }

  return parsed;
}
