/* eslint-disable no-console */
// One-time seeding for the word_of_day and fact rotation pools.
//
// Usage:
//   node --env-file=.env.local --experimental-strip-types scripts/seed-rotation-pools.ts --words
//   node --env-file=.env.local --experimental-strip-types scripts/seed-rotation-pools.ts --facts
//   node --env-file=.env.local --experimental-strip-types scripts/seed-rotation-pools.ts --all
//
// Writes JSON files under src/lib/modules/data/. Re-running merges with the
// existing JSON, deduping by word/fact text (case-insensitive). Safe to run
// repeatedly to expand pools.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Missing ANTHROPIC_API_KEY in env');
  process.exit(1);
}
const client = new Anthropic({ apiKey });
const MODEL = 'claude-sonnet-4-6';

const TARGET_PER_BUCKET = 500;
const BATCH_SIZE = 50;

interface WordEntry {
  word: string;
  partOfSpeech: string;
  definition: string;
  etymology: string;
  exampleSentence: string;
}
interface FactEntry {
  fact: string;
  explanation: string;
  category: string;
}

const WORD_BUCKETS = ['everyday', 'advanced', 'obscure'] as const;
const FACT_BUCKETS = ['science', 'nature', 'history', 'technology', 'psychology'] as const;

const WORDS_OUT = resolve(process.cwd(), 'src/lib/modules/data/words.json');
const FACTS_OUT = resolve(process.cwd(), 'src/lib/modules/data/facts.json');

// ─── JSON IO helpers ──────────────────────────────────────────

function loadExistingWords(): Record<string, WordEntry[]> {
  if (!existsSync(WORDS_OUT)) return { everyday: [], advanced: [], obscure: [] };
  try {
    return JSON.parse(readFileSync(WORDS_OUT, 'utf-8'));
  } catch {
    return { everyday: [], advanced: [], obscure: [] };
  }
}
function loadExistingFacts(): Record<string, FactEntry[]> {
  if (!existsSync(FACTS_OUT)) return { science: [], nature: [], history: [], technology: [], psychology: [] };
  try {
    return JSON.parse(readFileSync(FACTS_OUT, 'utf-8'));
  } catch {
    return { science: [], nature: [], history: [], technology: [], psychology: [] };
  }
}
function writeJSON(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// ─── Anthropic batch generation ──────────────────────────────

function extractJSON(raw: string): string {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const first = cleaned.indexOf('[');
  const last = cleaned.lastIndexOf(']');
  if (first === -1 || last === -1) throw new Error('No JSON array in response');
  return cleaned.slice(first, last + 1);
}

async function generateWordBatch(
  difficulty: string,
  count: number,
  existingWords: string[],
): Promise<WordEntry[]> {
  const excludeLine = existingWords.length
    ? `\n\nDO NOT include any of these words (already in the pool): ${existingWords.join(', ')}.`
    : '';

  const guidance: Record<string, string> = {
    everyday:
      'Common but interesting English words that an educated adult would recognize but find worth sharing. Avoid completely banal ("happy", "fast"). Lean toward words with rich histories, sensory texture, or specific shades of meaning.',
    advanced:
      'SAT/GRE-vocabulary level. Polysyllabic, often Latin or Greek roots, the kind of word a strong reader knows but does not use daily. Examples of the right tier: "ineluctable", "sycophant", "perspicacious".',
    obscure:
      'Rare, beautiful, or untranslatable words. Include words from other languages with no direct English equivalent (e.g. "saudade", "hiraeth"), archaic English ("apricity", "petrichor"), coined or obscure scientific terms. Each should reward the reader with a small "wow".',
  };

  const prompt =
    `Generate ${count} ${difficulty}-difficulty English words of the day. ${guidance[difficulty]}${excludeLine}\n\n` +
    `Return ONLY a JSON array, no markdown fences, no commentary. Each item:\n` +
    `{ "word": string, "partOfSpeech": string, "definition": string (one clear sentence), "etymology": string (one sentence with real verifiable origin), "exampleSentence": string (concrete and modern) }\n\n` +
    `Strict rules:\n` +
    `- Each word must be REAL and verifiable\n` +
    `- Etymologies must be factually accurate (do NOT invent origins)\n` +
    `- Example sentences should sound natural, not textbook-stiff\n` +
    `- No duplicate words within the batch\n` +
    `- partOfSpeech values: "noun", "verb", "adjective", "adverb", "interjection", "phrase"\n`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    const json = extractJSON(text);
    const parsed = JSON.parse(json) as WordEntry[];
    return parsed.filter((w) =>
      w && typeof w.word === 'string' && typeof w.definition === 'string' &&
      typeof w.partOfSpeech === 'string' && typeof w.etymology === 'string' &&
      typeof w.exampleSentence === 'string'
    );
  } catch (err) {
    console.warn(`[words/${difficulty}] parse failed:`, err);
    console.warn('first 400 chars:', text.slice(0, 400));
    return [];
  }
}

async function generateFactBatch(
  category: string,
  count: number,
  existingFacts: string[],
): Promise<FactEntry[]> {
  const excludeLine = existingFacts.length
    ? `\n\nDO NOT repeat the substance of any of these existing facts: ${existingFacts.slice(0, 50).join(' | ')}.${existingFacts.length > 50 ? ` (and ${existingFacts.length - 50} more)` : ''}`
    : '';

  const guidance: Record<string, string> = {
    science: 'Physics, chemistry, biology, astronomy, math. Specific numbers, named effects, verifiable results.',
    nature: 'Animals, plants, ecosystems, geology, weather. Specific species or places preferred.',
    history: 'Real events with verifiable dates. Avoid widely-debunked myths (e.g. "Vikings wore horned helmets", "Napoleon was short"). Lean toward genuinely surprising specifics.',
    technology: 'Computing, networks, AI, hardware, internet history. Verifiable claims with named systems or dates.',
    psychology: 'Cognition, behavior, perception. Cite the named effect or researcher when the fact has one (e.g. "Dunning-Kruger effect").',
  };

  const prompt =
    `Generate ${count} fascinating, verifiable facts in the category: ${category}. ${guidance[category]}${excludeLine}\n\n` +
    `Return ONLY a JSON array, no markdown fences. Each item:\n` +
    `{ "fact": string (1-2 sentences, specific with real numbers/names), "explanation": string (one sentence on why it is true or what it implies), "category": "${category}" }\n\n` +
    `Strict rules:\n` +
    `- Every fact must be VERIFIABLE and accurate. If unsure, skip it.\n` +
    `- Do not include the often-repeated debunked facts (humans only use 10% of brain, Great Wall visible from space, lightning never strikes twice, goldfish memory, etc.)\n` +
    `- Each fact should be genuinely counterintuitive or surprising — not common knowledge\n` +
    `- Avoid vague claims; include specific numbers, dates, names, or species\n` +
    `- No duplicates within the batch\n`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    const json = extractJSON(text);
    const parsed = JSON.parse(json) as FactEntry[];
    return parsed.filter((f) =>
      f && typeof f.fact === 'string' && typeof f.explanation === 'string'
    ).map((f) => ({ ...f, category }));
  } catch (err) {
    console.warn(`[facts/${category}] parse failed:`, err);
    console.warn('first 400 chars:', text.slice(0, 400));
    return [];
  }
}

// ─── Bucket runners ──────────────────────────────────────────

function dedupeWords(existing: WordEntry[], incoming: WordEntry[]): WordEntry[] {
  const seen = new Set(existing.map((w) => w.word.toLowerCase()));
  const out = [...existing];
  for (const w of incoming) {
    const key = w.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function dedupeFacts(existing: FactEntry[], incoming: FactEntry[]): FactEntry[] {
  // Dedupe loosely — same opening 60 chars treated as duplicate.
  const sig = (f: FactEntry) => f.fact.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 60);
  const seen = new Set(existing.map(sig));
  const out = [...existing];
  for (const f of incoming) {
    const key = sig(f);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

async function seedWords() {
  const data = loadExistingWords();
  for (const difficulty of WORD_BUCKETS) {
    const bucket = data[difficulty] ?? [];
    console.log(`[words/${difficulty}] starting at ${bucket.length}, target ${TARGET_PER_BUCKET}`);
    let attempts = 0;
    while (data[difficulty].length < TARGET_PER_BUCKET && attempts < 20) {
      attempts++;
      const need = Math.min(BATCH_SIZE, TARGET_PER_BUCKET - data[difficulty].length);
      const existingWords = data[difficulty].map((w) => w.word);
      const batch = await generateWordBatch(difficulty, need, existingWords);
      const before = data[difficulty].length;
      data[difficulty] = dedupeWords(data[difficulty], batch);
      const added = data[difficulty].length - before;
      console.log(`[words/${difficulty}] batch ${attempts}: generated ${batch.length}, kept ${added}, total ${data[difficulty].length}`);
      // Persist incrementally so a crash mid-run does not lose progress.
      writeJSON(WORDS_OUT, data);
      if (added === 0) break; // Saturated, stop hitting the API
    }
    console.log(`[words/${difficulty}] DONE at ${data[difficulty].length}`);
  }
}

async function seedFacts() {
  const data = loadExistingFacts();
  for (const category of FACT_BUCKETS) {
    const bucket = data[category] ?? [];
    console.log(`[facts/${category}] starting at ${bucket.length}, target ${TARGET_PER_BUCKET}`);
    let attempts = 0;
    while (data[category].length < TARGET_PER_BUCKET && attempts < 20) {
      attempts++;
      const need = Math.min(BATCH_SIZE, TARGET_PER_BUCKET - data[category].length);
      const existingFacts = data[category].map((f) => f.fact);
      const batch = await generateFactBatch(category, need, existingFacts);
      const before = data[category].length;
      data[category] = dedupeFacts(data[category], batch);
      const added = data[category].length - before;
      console.log(`[facts/${category}] batch ${attempts}: generated ${batch.length}, kept ${added}, total ${data[category].length}`);
      writeJSON(FACTS_OUT, data);
      if (added === 0) break;
    }
    console.log(`[facts/${category}] DONE at ${data[category].length}`);
  }
}

// ─── Entry point ─────────────────────────────────────────────

async function main() {
  const args = new Set(process.argv.slice(2));
  const runWords = args.has('--words') || args.has('--all');
  const runFacts = args.has('--facts') || args.has('--all');
  if (!runWords && !runFacts) {
    console.log('Usage: --words | --facts | --all');
    process.exit(1);
  }
  if (runWords) await seedWords();
  if (runFacts) await seedFacts();
  console.log('Done. Output files:');
  if (runWords) console.log(' ', WORDS_OUT);
  if (runFacts) console.log(' ', FACTS_OUT);
}

main().catch((err) => {
  console.error('Seeding crashed:', err);
  process.exit(1);
});
