import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Citation / arrow artifact stripping
// ─────────────────────────────────────────────────────────────

// Arrows in the Unicode arrow block (U+2190–U+21FF) plus a few common stylistic
// arrows Claude emits via web search citations.
const ARROW_RE = /[←-⇿⟰-⟿⤀-⥿➔➝➞➟➠➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱]/g;

// Citation-style markup we sometimes see leaking from the web_search tool:
//   "...as the Fed signaled[1][2]" → strip
//   "[^1]"                            → strip
//   "(1)" or "[1]" trailing a sentence → strip
//   "[Reuters]" or "(Source: Reuters)"   → strip
const CITATION_BRACKETS_RE = /\s?\[\^?\d{1,3}\]/g;
const TRAILING_SOURCE_PAREN_RE = /\s?\((?:source|src)\s*[:\-]\s*[^)]{0,80}\)/gi;
const TRAILING_PUB_BRACKET_RE = /\s?\[[A-Z][a-zA-Z .&'-]{1,40}\]\s*$/;

export function stripCitationArtifacts(input: unknown): string {
  if (typeof input !== 'string') return input as unknown as string;
  let s = input;
  s = s.replace(ARROW_RE, '');
  s = s.replace(CITATION_BRACKETS_RE, '');
  s = s.replace(TRAILING_SOURCE_PAREN_RE, '');
  s = s.replace(TRAILING_PUB_BRACKET_RE, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

// ─────────────────────────────────────────────────────────────
// Zod shape for a single article and the news section
// ─────────────────────────────────────────────────────────────

const articleSchema = z.object({
  headline: z.string().min(1),
  source: z.string().min(1),
  summary: z.string().min(1),
  url: z.string().url().refine((u) => /^https?:\/\//.test(u), 'must be http(s)'),
});

export type NewsArticle = z.infer<typeof articleSchema>;

export interface NewsSectionData {
  articles: NewsArticle[];
}

// ─────────────────────────────────────────────────────────────
// Validation pass — runs first, no network
// ─────────────────────────────────────────────────────────────

export interface NewsValidationOutcome {
  articles: NewsArticle[];
  rejected: { article: unknown; reason: string }[];
}

function hasResidualArtifacts(s: string): boolean {
  return ARROW_RE.test(s) || CITATION_BRACKETS_RE.test(s);
}

function isLikelyHomepageOrSearch(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname.includes('google.com') && u.pathname.startsWith('/search')) return true;
    if (u.pathname === '/' || u.pathname === '') return true;
    // Very short path with no slug ("/news", "/world") often indicates a section page
    if (u.pathname.length < 6 && !u.search) return true;
    return false;
  } catch {
    return true;
  }
}

export function validateNewsSection(raw: unknown): NewsValidationOutcome {
  const rejected: { article: unknown; reason: string }[] = [];
  if (raw === null || typeof raw !== 'object') {
    return { articles: [], rejected: [{ article: raw, reason: 'data is not an object' }] };
  }
  const articlesIn = (raw as { articles?: unknown }).articles;
  if (!Array.isArray(articlesIn)) {
    return { articles: [], rejected: [{ article: articlesIn, reason: 'articles field missing or not an array' }] };
  }

  const valid: NewsArticle[] = [];
  for (const item of articlesIn) {
    // Run the citation/arrow stripper on string fields BEFORE schema validation
    // so cleanable artifacts do not fail the article.
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      for (const field of ['headline', 'source', 'summary'] as const) {
        if (typeof obj[field] === 'string') obj[field] = stripCitationArtifacts(obj[field] as string);
      }
    }

    const parsed = articleSchema.safeParse(item);
    if (!parsed.success) {
      // Reset ARROW_RE/CITATION_BRACKETS_RE lastIndex which is sticky across .test calls
      ARROW_RE.lastIndex = 0;
      CITATION_BRACKETS_RE.lastIndex = 0;
      rejected.push({ article: item, reason: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      continue;
    }

    // Post-parse content checks
    if (
      hasResidualArtifacts(parsed.data.headline) ||
      hasResidualArtifacts(parsed.data.summary) ||
      hasResidualArtifacts(parsed.data.source)
    ) {
      ARROW_RE.lastIndex = 0;
      CITATION_BRACKETS_RE.lastIndex = 0;
      rejected.push({ article: item, reason: 'residual arrow or citation marker after strip' });
      continue;
    }

    if (isLikelyHomepageOrSearch(parsed.data.url)) {
      rejected.push({ article: item, reason: 'url looks like a homepage or search result' });
      continue;
    }

    ARROW_RE.lastIndex = 0;
    CITATION_BRACKETS_RE.lastIndex = 0;
    valid.push(parsed.data);
  }

  return { articles: valid, rejected };
}

// ─────────────────────────────────────────────────────────────
// URL HEAD sanity check — 3s timeout per article, run in parallel
// ─────────────────────────────────────────────────────────────

export async function checkArticleUrls(
  articles: NewsArticle[]
): Promise<{ live: NewsArticle[]; dead: { article: NewsArticle; reason: string }[] }> {
  const live: NewsArticle[] = [];
  const dead: { article: NewsArticle; reason: string }[] = [];

  // Browser-like UA reduces bot-block rejections from major publishers.
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
  };

  const results = await Promise.all(
    articles.map(async (a) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        // Try HEAD first. Some publishers reject HEAD with 403/405 — fall back to GET.
        let res = await fetch(a.url, { method: 'HEAD', signal: controller.signal, redirect: 'follow', headers });
        if (res.status === 403 || res.status === 405 || res.status === 501) {
          res = await fetch(a.url, { method: 'GET', signal: controller.signal, redirect: 'follow', headers });
        }
        // 2xx and 3xx → URL resolves cleanly.
        // 401/403 → URL exists but the server is auth-walled or bot-blocked. Treat as
        //   live: the link works for the human reading the email even if our HEAD doesn't.
        if (res.status >= 200 && res.status < 400) return { ok: true, article: a } as const;
        if (res.status === 401 || res.status === 403) return { ok: true, article: a } as const;
        return { ok: false, article: a, reason: `status ${res.status}` } as const;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, article: a, reason: message } as const;
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  for (const r of results) {
    if (r.ok) live.push(r.article);
    else dead.push({ article: r.article, reason: r.reason });
  }
  return { live, dead };
}

// ─────────────────────────────────────────────────────────────
// Retry call — targeted re-prompt for replacement articles only
// ─────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function retryNewsForReplacements(args: {
  topics: string[];
  customQuery?: string;
  sources?: string[];
  excludeTopics?: string;
  missingCount: number;
  alreadyUsedUrls: string[];
}): Promise<{ articles: NewsArticle[]; tokensUsed: number }> {
  const {
    topics, customQuery, sources, excludeTopics, missingCount, alreadyUsedUrls,
  } = args;

  if (missingCount <= 0) return { articles: [], tokensUsed: 0 };

  const exclude = alreadyUsedUrls.length
    ? `\nDo NOT return any of these URLs (we already have them): ${alreadyUsedUrls.join(', ')}.`
    : '';

  const prompt =
    `You are filling gaps in a news brief. We need exactly ${missingCount} additional news article${missingCount === 1 ? '' : 's'} from the last 24 hours.\n\n` +
    `Broaden the search beyond the obvious top headlines. Topics: ${topics.join(', ')}.` +
    (customQuery ? ` Specifically focus on: ${customQuery}.` : '') +
    (sources?.length ? ` Prefer these sources: ${sources.join(', ')}.` : '') +
    (excludeTopics ? ` Exclude any articles about: ${excludeTopics}.` : '') +
    exclude +
    `\n\nReturn ONLY valid JSON, no markdown fences, no preface:\n` +
    `{ "articles": [ { "headline": string, "source": string, "summary": string, "url": string } ] }\n\n` +
    `Strict rules:\n` +
    `- exactly ${missingCount} article${missingCount === 1 ? '' : 's'}\n` +
    `- NO citation markers ([1], [^1], etc.) in any field\n` +
    `- NO arrow characters (↗ ↘ → etc.) in any field\n` +
    `- summary is exactly 2 sentences\n` +
    `- url is the direct article permalink (https://...), not a homepage or search-result URL\n` +
    `- source is the publication name only\n`;

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{ role: 'user', content: prompt }],
  });

  const tokensUsed = response.usage?.output_tokens ?? 0;

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  const first = rawText.indexOf('{');
  const last = rawText.lastIndexOf('}');
  if (first === -1 || last === -1) {
    console.warn('[News:retry] No JSON object found in retry response.');
    return { articles: [], tokensUsed };
  }

  try {
    const obj = JSON.parse(rawText.slice(first, last + 1));
    const validation = validateNewsSection(obj);
    return { articles: validation.articles, tokensUsed };
  } catch (err) {
    console.warn('[News:retry] Retry JSON parse failed:', err instanceof Error ? err.message : err);
    return { articles: [], tokensUsed };
  }
}

// ─────────────────────────────────────────────────────────────
// Public orchestrator — used from pipeline.ts
// ─────────────────────────────────────────────────────────────

export interface NewsRefinementResult {
  finalArticles: NewsArticle[];
  requestedCount: number;
  retried: boolean;
  retryTokens: number;
  underdelivered: boolean;
  log: {
    requested: number;
    initial_parsed: number;
    initial_rejected: number;
    after_url_check: number;
    after_retry: number;
    final: number;
  };
}

export async function refineNewsSection(args: {
  rawSectionData: unknown;
  requestedCount: number;
  topics: string[];
  customQuery?: string;
  sources?: string[];
  excludeTopics?: string;
}): Promise<NewsRefinementResult> {
  const { rawSectionData, requestedCount, topics, customQuery, sources, excludeTopics } = args;

  // 1. Schema + content validation
  const initial = validateNewsSection(rawSectionData);
  if (initial.rejected.length) {
    console.warn(`[News] Rejected ${initial.rejected.length} article(s) at validation:`, initial.rejected.map((r) => r.reason));
  }

  // 2. URL HEAD check
  const { live, dead } = await checkArticleUrls(initial.articles);
  if (dead.length) {
    console.warn(`[News] Dropped ${dead.length} article(s) failing URL check:`, dead.map((d) => `${d.reason} ${d.article.url}`));
  }

  let final = live;
  let retried = false;
  let retryTokens = 0;

  // 3. If short, retry once
  if (final.length < requestedCount) {
    retried = true;
    const missing = requestedCount - final.length;
    console.log(`[News] Short by ${missing} after validation+URL check, retrying once`);
    const retry = await retryNewsForReplacements({
      topics, customQuery, sources, excludeTopics,
      missingCount: missing,
      alreadyUsedUrls: final.map((a) => a.url),
    });
    retryTokens = retry.tokensUsed;

    // URL-check the retry articles too
    const retryCheck = await checkArticleUrls(retry.articles);
    if (retryCheck.dead.length) {
      console.warn(`[News] Retry URLs dropped:`, retryCheck.dead.map((d) => `${d.reason} ${d.article.url}`));
    }

    // Dedup against existing urls
    const existing = new Set(final.map((a) => a.url));
    for (const a of retryCheck.live) {
      if (existing.has(a.url) || final.length >= requestedCount) continue;
      final.push(a);
      existing.add(a.url);
    }
  }

  // 4. Cap at requestedCount even if we overshot
  if (final.length > requestedCount) final = final.slice(0, requestedCount);

  const log = {
    requested: requestedCount,
    initial_parsed: initial.articles.length,
    initial_rejected: initial.rejected.length,
    after_url_check: live.length,
    after_retry: final.length,
    final: final.length,
  };

  console.log('[News] Refinement result:', JSON.stringify(log));

  return {
    finalArticles: final,
    requestedCount,
    retried,
    retryTokens,
    underdelivered: final.length < requestedCount,
    log,
  };
}
