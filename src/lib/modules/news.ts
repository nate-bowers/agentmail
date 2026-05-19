import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

// Article count is now fixed at 3. We keep `articleCount` in the schema so
// old DB rows that still carry `5` or `10` continue to parse without error;
// the value is ignored at generate time.
export const FIXED_ARTICLE_COUNT = 3;

export const configSchema = z.object({
  topics: z
    .array(z.string().min(1).max(40, 'Topic name is too long'))
    .min(1, 'Add at least one topic')
    .max(5, 'Maximum 5 topics'),
  customQuery: z.string().max(200).optional(),
  sources: z.array(z.string().max(40, 'Source name is too long')).max(3).optional(),
  // Legacy field — accepts old values (3, 5, 10) for back-compat but is no
  // longer surfaced in the UI and is ignored at generate time. Always defaults
  // to 3 for new rows.
  articleCount: z.union([z.literal(3), z.literal(5), z.literal(10)]).optional().default(3),
  excludeTopics: z.string().max(100).optional(),
});

export type NewsConfig = z.infer<typeof configSchema>;

export const newsModule: ModuleDefinition<typeof configSchema> = {
  type: 'news',
  label: 'News',
  description: 'Three top headlines from the last 24 hours on topics you choose.',
  icon: 'Newspaper',
  defaultConfig: {
    topics: ['technology', 'business'],
    articleCount: 3,
  } satisfies NewsConfig,
  configSchema,
  buildSearchInstruction(config) {
    const topicList = config.topics.join(', ');
    const userSources = (config.sources ?? []).filter((s) => s && s.trim());
    const hasUserSources = userSources.length > 0;

    let instruction =
      `Search for EXACTLY ${FIXED_ARTICLE_COUNT} news articles from the last 24 hours about: ${topicList}. ` +
      `Return exactly ${FIXED_ARTICLE_COUNT} articles, not fewer and not more.`;
    if (config.customQuery) {
      instruction += ` Specifically focus on: ${config.customQuery}.`;
    }
    if (config.excludeTopics) {
      instruction += ` Exclude any articles about: ${config.excludeTopics}.`;
    }

    // SOURCE RULES — different behavior depending on whether the user has
    // pinned specific publications.
    if (hasUserSources) {
      // User explicitly chose. Treat their list as a hard whitelist, not a
      // soft hint. Do not impose the "3 different publications" diversity
      // rule, since picking the same trusted outlet 3 times is a valid
      // outcome when that's what the user asked for.
      instruction +=
        `\n\nREQUIRED SOURCES (hard rule):\n` +
        `- Every article MUST come from one of these publications: ${userSources.join(', ')}.\n` +
        `- Do NOT substitute other outlets. If you can't find ${FIXED_ARTICLE_COUNT} fresh stories ` +
        `from these publications, return as many as you can rather than padding with other sources.\n` +
        `- Multiple articles from the same listed publication are fine — match the user's pinned outlets even if it means repeating one.`;
    } else {
      instruction +=
        `\n\nSOURCE DIVERSITY (critical):\n` +
        `- All ${FIXED_ARTICLE_COUNT} articles MUST come from ${FIXED_ARTICLE_COUNT} DIFFERENT publications. Never two articles from the same source.\n` +
        `- Strongly prefer well-known mainstream outlets: Reuters, Associated Press, BBC, The New York Times, The Washington Post, ` +
        `The Wall Street Journal, Bloomberg, Financial Times, The Guardian, The Economist, NPR, CNN, CNBC, Axios, Politico, ` +
        `The Verge, Ars Technica, TechCrunch, Wired, MIT Technology Review, Nature, Science, ESPN, The Athletic, Variety.\n` +
        `- Do NOT use small unknown blogs, content-farm aggregators, or "news network" sites with vague names.\n` +
        `- If a story is only available from a small unknown source, skip it and find a different story from a mainstream outlet.`;
    }

    instruction +=
      `\n\nEach article must include: headline (string), source (publication name only — no URL, no domain), ` +
      `summary (exactly 2 sentences capturing why the story matters), ` +
      `and url (the DIRECT permalink to the article page, not the publication homepage and not a search-results URL).\n\n` +
      `Strict content rules for every field:\n` +
      `(1) NO citation markers of any kind — no [1], [2], [^1], no bracketed numbers, no superscripts;\n` +
      `(2) NO HTML tags — no <cite>, <ref>, <a>, no opening or closing angle-bracket tags of any kind;\n` +
      `(3) NO arrow characters — no ↗ ↘ → ← ⇒ or any U+2190–U+21FF arrow glyph;\n` +
      `(4) NO trailing reference symbols like "(Source)" or "[Reuters]";\n` +
      `(5) The "url" field must start with https:// and point to the specific article;\n` +
      `(6) The "source" field is the publication name only, e.g. "Reuters", not a URL.`;
    return instruction;
  },
};
