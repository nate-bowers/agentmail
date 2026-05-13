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
  | {
      type: 'weather';
      data: {
        locations: {
          name: string;
          tempF: number;
          condition: string;
          humidity: string;
          high: number;
          low: number;
        }[];
      };
    }
  | {
      type: 'news';
      data: {
        articles: {
          headline: string;
          source: string;
          summary: string;
        }[];
      };
    }
  | {
      type: 'quote';
      data: { text: string; author: string };
    }
  | {
      type: 'markets';
      data: {
        symbols: {
          symbol: string;
          price: string;
          change: string;
          changePercent: string;
          direction: 'up' | 'down';
        }[];
      };
    };

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

After completing all searches, write a short personalized intro of 2–3 sentences addressed to ${firstName} by first name. The intro should briefly acknowledge the day ahead based on what you found (weather, news, etc.) in a warm, concise tone.

Respond ONLY with valid JSON. No markdown fences, no backticks, no preamble, no trailing text — just the raw JSON object.

The JSON must follow this exact shape:
{
  "intro": "<2-3 sentence personalized intro>",
  "sections": [
    {
      "type": "weather",
      "data": {
        "locations": [
          { "name": "string", "tempF": 0, "condition": "string", "humidity": "string", "high": 0, "low": 0 }
        ]
      }
    },
    {
      "type": "news",
      "data": {
        "articles": [
          { "headline": "string", "source": "string", "summary": "string" }
        ]
      }
    },
    {
      "type": "quote",
      "data": { "text": "string", "author": "string" }
    },
    {
      "type": "markets",
      "data": {
        "symbols": [
          { "symbol": "string", "price": "string", "change": "string", "changePercent": "string", "direction": "up" }
        ]
      }
    }
  ]
}

Only include sections for the modules listed above. Sections must appear in this order: ${sectionOrder}.
Use the exact type strings shown ("weather", "news", "quote", "markets").
For markets, "direction" must be exactly "up" or "down" based on today's change.`;
}

// ─────────────────────────────────────────────────────────────
// Main generation function
// ─────────────────────────────────────────────────────────────

export async function generateDailyBrief(
  user: Pick<Profile, 'full_name' | 'email'>,
  modules: ModuleRow[]
): Promise<GeneratedBrief> {
  // Sort by display_order before building instructions so section order is preserved
  const sorted = [...modules].sort((a, b) => a.display_order - b.display_order);
  const instructions = buildSearchInstructions(sorted);

  if (instructions.length === 0) {
    throw new Error('[generate] No valid modules found — cannot generate brief.');
  }

  const prompt = buildPrompt(user, instructions);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    // web_search_20250305 is a built-in tool type not yet reflected in the SDK's
    // ToolUnion. Cast the array to bypass the type gap.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract all text blocks from the response (search results come as tool_result blocks;
  // the final answer is in text blocks)
  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!rawText) {
    console.error('[generate] No text block in Claude response:', JSON.stringify(response.content));
    throw new Error('[generate] Claude returned no text content.');
  }

  // Strip accidental markdown fences Claude sometimes adds despite instructions
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
    throw new Error(
      '[generate] Claude response was not valid JSON. See server logs for the raw response.'
    );
  }

  return parsed;
}
