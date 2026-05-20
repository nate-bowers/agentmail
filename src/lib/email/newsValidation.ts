import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { stripDashesDeep } from '@/lib/email/dashStripper';

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
//   "<cite index=\"22-2\">...</cite>"  → strip the tags but KEEP the inner text
const CITATION_BRACKETS_RE = /\s?\[\^?\d{1,3}\]/g;
const TRAILING_SOURCE_PAREN_RE = /\s?\((?:source|src)\s*[:\-]\s*[^)]{0,80}\)/gi;
const TRAILING_PUB_BRACKET_RE = /\s?\[[A-Z][a-zA-Z .&'-]{1,40}\]\s*$/;

// HTML-style citation tags Claude's web_search tool emits. The most common
// is <cite index="22-2">sentence</cite>. Strip the tags only — keep the inner
// text since it is the actual content of the article summary.
// We match any <cite>/</cite> pair, and also a defensive sweep for any other
// HTML-like tag in the news text (those should never appear in plain prose).
const CITE_TAG_OPEN_RE = /<cite\b[^>]*>/gi;
const CITE_TAG_CLOSE_RE = /<\/cite\s*>/gi;
// Generic safety net: any tag that starts with a letter (so "5 < 10" is safe).
const GENERIC_HTML_TAG_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^<>]*)?>/g;

export function stripCitationArtifacts(input: unknown): string {
  if (typeof input !== 'string') return input as unknown as string;
  let s = input;
  s = s.replace(CITE_TAG_OPEN_RE, '');
  s = s.replace(CITE_TAG_CLOSE_RE, '');
  s = s.replace(GENERIC_HTML_TAG_RE, '');
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
  // whyItMatters is required for new generations but optional in the schema
  // so legacy cached articles (built before this field existed) don't fail
  // validation and disappear from the email.
  whyItMatters: z.string().min(1).max(200).optional(),
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
  const r = ARROW_RE.test(s) || CITATION_BRACKETS_RE.test(s) ||
    CITE_TAG_OPEN_RE.test(s) || CITE_TAG_CLOSE_RE.test(s);
  // .test() on /g regexes mutates lastIndex; reset to keep behavior stable across calls
  ARROW_RE.lastIndex = 0;
  CITATION_BRACKETS_RE.lastIndex = 0;
  CITE_TAG_OPEN_RE.lastIndex = 0;
  CITE_TAG_CLOSE_RE.lastIndex = 0;
  return r;
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

export function validateNewsSection(
  raw: unknown,
  options: { skipSourceDedup?: boolean } = {},
): NewsValidationOutcome {
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

    // URL-shape checks moved to the validateAndFixArticleUrls phase. Articles
    // here pass content validation; their URLs may or may not work. The URL
    // phase will keep the article and either fix the URL via per-article
    // Claude retry or drop the link entirely (preserving the article body).

    ARROW_RE.lastIndex = 0;
    CITATION_BRACKETS_RE.lastIndex = 0;
    valid.push(parsed.data);
  }

  // Source diversity: keep only the first article per (case-insensitive) source.
  // Skipped when the caller pinned specific sources (user explicitly chose those
  // publications and may legitimately want multiple stories from one of them).
  if (options.skipSourceDedup) {
    return { articles: valid, rejected };
  }

  const seenSources = new Set<string>();
  const diverse: NewsArticle[] = [];
  for (const article of valid) {
    const key = article.source.trim().toLowerCase();
    if (seenSources.has(key)) {
      rejected.push({ article, reason: `duplicate source "${article.source}"` });
      continue;
    }
    seenSources.add(key);
    diverse.push(article);
  }

  return { articles: diverse, rejected };
}

// ─────────────────────────────────────────────────────────────
// URL HEAD sanity check — 3s timeout per article, run in parallel
// ─────────────────────────────────────────────────────────────

// Browser-like UA reduces bot-block rejections from major publishers.
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
};
const URL_CHECK_TIMEOUT_MS = 5000;

interface UrlCheckResult {
  ok: boolean;
  /** Final URL after redirects (or the original on failure). */
  finalUrl: string;
  reason?: string;
}

/**
 * Single-URL probe: HEAD → GET fallback → resolve redirects → final-URL
 * homepage check. Returns granular result so callers can decide whether to
 * retry, drop, or accept.
 */
async function probeUrl(url: string): Promise<UrlCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow', headers: FETCH_HEADERS });
    if (res.status === 403 || res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow', headers: FETCH_HEADERS });
    }
    const finalUrl = res.url || url;
    // 4xx/5xx = dead, except 401/403 which mean "URL exists but bot-blocked"
    // (still works for a human in the email).
    if (res.status === 401 || res.status === 403) {
      return { ok: true, finalUrl };
    }
    if (res.status < 200 || res.status >= 400) {
      return { ok: false, finalUrl, reason: `status ${res.status}` };
    }
    // Post-redirect homepage check. A surprising number of "article" URLs
    // 30x straight to the publication's homepage — perfectly valid HTTP, but
    // a worthless link in the email.
    if (isLikelyHomepageOrSearch(finalUrl)) {
      return { ok: false, finalUrl, reason: 'resolved to homepage / section page' };
    }
    return { ok: true, finalUrl };
  } catch (err) {
    return { ok: false, finalUrl: url, reason: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkArticleUrls(
  articles: NewsArticle[]
): Promise<{ live: NewsArticle[]; dead: { article: NewsArticle; reason: string }[] }> {
  const live: NewsArticle[] = [];
  const dead: { article: NewsArticle; reason: string }[] = [];

  const results = await Promise.all(
    articles.map(async (a) => ({ article: a, probe: await probeUrl(a.url) }))
  );

  for (const { article, probe } of results) {
    if (probe.ok) live.push(article);
    else dead.push({ article, reason: probe.reason ?? 'unknown' });
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
  alreadyUsedSources?: string[];
}): Promise<{ articles: NewsArticle[]; tokensUsed: number }> {
  const {
    topics, customQuery, sources, excludeTopics, missingCount, alreadyUsedUrls, alreadyUsedSources,
  } = args;

  if (missingCount <= 0) return { articles: [], tokensUsed: 0 };

  const exclude = alreadyUsedUrls.length
    ? `\nDo NOT return any of these URLs (we already have them): ${alreadyUsedUrls.join(', ')}.`
    : '';

  const hasUserSources = !!sources?.length;

  // Two prompt modes depending on whether the user pinned specific publications.
  const sourceBlock = hasUserSources
    ? `\nREQUIRED SOURCES (hard rule): articles MUST come from one of these publications: ${sources!.join(', ')}. ` +
      `Do not substitute other outlets. If you cannot find fresh stories from these, return fewer articles rather than padding.`
    : (alreadyUsedSources && alreadyUsedSources.length
        ? `\nThe new article(s) MUST come from DIFFERENT publications than these (which we already have): ${alreadyUsedSources.join(', ')}.`
        : ''
      ) +
      `\n\nStrongly prefer well-known mainstream outlets: Reuters, Associated Press, BBC, The New York Times, ` +
      `The Washington Post, The Wall Street Journal, Bloomberg, Financial Times, The Guardian, The Economist, NPR, ` +
      `CNN, CNBC, Axios, Politico, The Verge, Ars Technica, TechCrunch, Wired, MIT Technology Review.\n` +
      `Do NOT use small unknown blogs, content-farm aggregators, or "news network" sites with vague names.`;

  const prompt =
    `You are filling gaps in a news brief. We need exactly ${missingCount} additional news article${missingCount === 1 ? '' : 's'} from the last 24 hours.\n\n` +
    `Broaden the search beyond the obvious top headlines. Topics: ${topics.join(', ')}.` +
    (customQuery ? ` Specifically focus on: ${customQuery}.` : '') +
    (excludeTopics ? ` Exclude any articles about: ${excludeTopics}.` : '') +
    exclude +
    sourceBlock +
    `\n\nReturn ONLY valid JSON, no markdown fences, no preface:\n` +
    `{ "articles": [ { "headline": string, "source": string, "summary": string, "url": string } ] }\n\n` +
    `Strict rules:\n` +
    `- exactly ${missingCount} article${missingCount === 1 ? '' : 's'}\n` +
    `- NO citation markers ([1], [^1], etc.) in any field\n` +
    `- NO HTML tags (<cite>, <a>, etc.) in any field\n` +
    `- NO arrow characters (↗ ↘ → etc.) in any field\n` +
    `- summary is exactly 2 sentences\n` +
    `- url is the direct article permalink (https://...), not a homepage or search-result URL\n` +
    `- source is the publication name only, not a URL or domain\n`;

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
    const dashResult = stripDashesDeep(obj);
    if (dashResult.replacements > 0) {
      console.warn(`[News:retry] Stripped ${dashResult.replacements} dash(es) from retry output`);
    }
    // When user has pinned sources, skip the diversity-dedup so multiple
    // articles from one outlet pass through.
    const validation = validateNewsSection(dashResult.value, { skipSourceDedup: hasUserSources });
    return { articles: validation.articles, tokensUsed };
  } catch (err) {
    console.warn('[News:retry] Retry JSON parse failed:', err instanceof Error ? err.message : err);
    return { articles: [], tokensUsed };
  }
}

// ─────────────────────────────────────────────────────────────
// Per-article URL retry — Haiku call that asks for THIS article's direct
// permalink. Used when the original URL fails HEAD/GET or resolves to a
// homepage. Cap is one retry per bad article (controls cost).
// ─────────────────────────────────────────────────────────────

/**
 * If true, when an article's URL still fails after the one retry, link to a
 * Google News search for the headline. If false, drop the link entirely and
 * render only the headline + summary + whyItMatters.
 *
 * Default is `false` per the product call: a missing link is better than a
 * search-results link. Flip to `true` if I change my mind.
 */
const FALLBACK_TO_GOOGLE_NEWS = false;

function googleNewsSearchUrl(headline: string): string {
  return `https://news.google.com/search?q=${encodeURIComponent(headline)}`;
}

async function retryArticleUrl(args: {
  article: NewsArticle;
  topics: string[];
  customQuery?: string;
}): Promise<{ url: string | null; tokensUsed: number }> {
  const { article, topics, customQuery } = args;

  const prompt =
    `I have a real news article but my saved URL is broken. Find the canonical, ` +
    `direct permalink to this specific article and return ONLY that URL on a single line.\n\n` +
    `Headline: "${article.headline}"\n` +
    `Source: ${article.source}\n` +
    `Summary: ${article.summary}\n` +
    `Topics the user follows: ${topics.join(', ')}` +
    (customQuery ? ` (focus: ${customQuery})` : '') + `.\n\n` +
    `Rules:\n` +
    `- Return the FULL deep link to the specific article page, never the publication homepage, section page, tag page, or a search-results URL.\n` +
    `- The URL must start with https://.\n` +
    `- If you cannot find the direct article link from a credible source, return the single token NONE.\n` +
    `- Output nothing else — no preface, no quotes, no markdown.`;

  let response;
  try {
    response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    console.warn('[News:url-retry] Claude call failed:', err instanceof Error ? err.message : err);
    return { url: null, tokensUsed: 0 };
  }

  const tokensUsed = response.usage?.output_tokens ?? 0;
  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!rawText || /^NONE\b/i.test(rawText)) {
    return { url: null, tokensUsed };
  }

  // Claude sometimes wraps the URL in markdown or quotes. Extract the first https URL.
  const match = rawText.match(/https?:\/\/[^\s)>\]"']+/);
  if (!match) return { url: null, tokensUsed };
  return { url: match[0], tokensUsed };
}

export interface UrlValidationLog {
  total: number;
  validFirstPass: number;
  retried: number;
  recoveredByRetry: number;
  finalDropped: number;
  fellBackToSearch: number;
  retryTokens: number;
}

/**
 * Validate every article's URL. For each article that fails HEAD/GET or
 * resolves to a homepage, fire one Claude retry asking for the direct URL.
 * If the retry's URL also fails, either drop the link entirely (default) or
 * substitute a Google News search URL based on FALLBACK_TO_GOOGLE_NEWS.
 *
 * Returns the same articles, with `url` either kept (validated) or removed
 * (failed). Caller's render layer must handle missing url gracefully.
 */
async function validateAndFixArticleUrls(
  articles: NewsArticle[],
  topics: string[],
  customQuery: string | undefined,
): Promise<{ articles: NewsArticle[]; log: UrlValidationLog }> {
  const log: UrlValidationLog = {
    total: articles.length,
    validFirstPass: 0,
    retried: 0,
    recoveredByRetry: 0,
    finalDropped: 0,
    fellBackToSearch: 0,
    retryTokens: 0,
  };

  // First pass: probe every URL in parallel.
  const probes = await Promise.all(
    articles.map(async (a) => ({ article: a, probe: await probeUrl(a.url) }))
  );

  // Walk results sequentially. For first-pass failures, fire ONE per-article
  // Claude retry. Run those retries in parallel too.
  const retryWork = probes.map(async ({ article, probe }) => {
    if (probe.ok) {
      log.validFirstPass++;
      return { ...article, url: probe.finalUrl };
    }
    log.retried++;
    const { url: newUrl, tokensUsed } = await retryArticleUrl({ article, topics, customQuery });
    log.retryTokens += tokensUsed;
    if (newUrl) {
      const retryProbe = await probeUrl(newUrl);
      if (retryProbe.ok) {
        log.recoveredByRetry++;
        return { ...article, url: retryProbe.finalUrl };
      }
    }
    // Retry didn't recover. Fall back per config.
    if (FALLBACK_TO_GOOGLE_NEWS) {
      log.fellBackToSearch++;
      return { ...article, url: googleNewsSearchUrl(article.headline) };
    }
    log.finalDropped++;
    // Drop the URL field but keep the article. The render layer skips the
    // "Continue reading" link when url is empty.
    return { ...article, url: '' };
  });

  const finalArticles = await Promise.all(retryWork);
  return { articles: finalArticles, log };
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
    /** Per-article URL validation metrics (new). */
    url: UrlValidationLog;
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
  // When the user pinned specific publications, we honor their list as a
  // whitelist instead of enforcing the diversity-dedup rule.
  const hasUserSources = !!sources && sources.length > 0;

  // 1. Schema + content validation. URL handling moves to step 2.
  const initial = validateNewsSection(rawSectionData, { skipSourceDedup: hasUserSources });
  if (initial.rejected.length) {
    console.warn(`[News] Rejected ${initial.rejected.length} article(s) at content validation:`, initial.rejected.map((r) => r.reason));
  }

  // 2. Per-article URL validate + fix. Each article either keeps a working
  // URL (validated, or recovered by per-article Claude retry) or has its
  // URL dropped (rendered without "Continue at <Pub>" link). Articles
  // themselves are never dropped here.
  const urlPhase = await validateAndFixArticleUrls(initial.articles, topics, customQuery);
  let final: NewsArticle[] = urlPhase.articles;
  let retryTokens = urlPhase.log.retryTokens;
  let retried = urlPhase.log.retried > 0;

  // 3. Count shortfall handling. If Claude returned fewer articles than
  // requested (after content validation rejected some), fire the batch
  // retry to fill missing slots. Per-article URL validation also applies
  // to the retry results.
  if (final.length < requestedCount) {
    retried = true;
    const missing = requestedCount - final.length;
    console.log(`[News] Short by ${missing} after content validation, batch-retrying`);
    const retry = await retryNewsForReplacements({
      topics, customQuery, sources, excludeTopics,
      missingCount: missing,
      alreadyUsedUrls: final.map((a) => a.url).filter(Boolean),
      alreadyUsedSources: final.map((a) => a.source),
    });
    retryTokens += retry.tokensUsed;

    // Apply per-article URL validation to retry articles too.
    const retryUrlPhase = await validateAndFixArticleUrls(retry.articles, topics, customQuery);
    retryTokens += retryUrlPhase.log.retryTokens;

    // Merge logs.
    urlPhase.log.total += retryUrlPhase.log.total;
    urlPhase.log.validFirstPass += retryUrlPhase.log.validFirstPass;
    urlPhase.log.retried += retryUrlPhase.log.retried;
    urlPhase.log.recoveredByRetry += retryUrlPhase.log.recoveredByRetry;
    urlPhase.log.finalDropped += retryUrlPhase.log.finalDropped;
    urlPhase.log.fellBackToSearch += retryUrlPhase.log.fellBackToSearch;

    // Dedup against existing URLs / sources. URLs may be empty strings
    // for dropped-link articles — those don't collide.
    const existingUrls = new Set(final.map((a) => a.url).filter(Boolean));
    const existingSources = new Set(final.map((a) => a.source.trim().toLowerCase()));
    for (const a of retryUrlPhase.articles) {
      if (a.url && existingUrls.has(a.url)) continue;
      if (!hasUserSources && existingSources.has(a.source.trim().toLowerCase())) continue;
      if (final.length >= requestedCount) break;
      final.push(a);
      if (a.url) existingUrls.add(a.url);
      existingSources.add(a.source.trim().toLowerCase());
    }
  }

  // 4. Cap at requestedCount even if we overshot
  if (final.length > requestedCount) final = final.slice(0, requestedCount);

  const log = {
    requested: requestedCount,
    initial_parsed: initial.articles.length,
    initial_rejected: initial.rejected.length,
    // after_url_check = count of articles with a working URL after the URL phase
    after_url_check: final.filter((a) => !!a.url).length,
    after_retry: final.length,
    final: final.length,
    url: urlPhase.log,
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
