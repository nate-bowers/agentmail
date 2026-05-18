import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  topics: z
    .array(z.string().min(1).max(40, 'Topic name is too long'))
    .min(1, 'Add at least one topic')
    .max(5, 'Maximum 5 topics'),
  customQuery: z.string().max(200).optional(),
  sources: z.array(z.string().max(40, 'Source name is too long')).max(3).optional(),
  articleCount: z.union([z.literal(3), z.literal(5), z.literal(10)]).default(5),
  excludeTopics: z.string().max(100).optional(),
});

export type NewsConfig = z.infer<typeof configSchema>;

export const newsModule: ModuleDefinition<typeof configSchema> = {
  type: 'news',
  label: 'News',
  description: 'Top headlines from the last 24 hours on topics you choose.',
  icon: 'Newspaper',
  defaultConfig: {
    topics: ['technology', 'business'],
    articleCount: 5,
  } satisfies NewsConfig,
  configSchema,
  buildSearchInstruction(config) {
    const topicList = config.topics.join(', ');
    let instruction =
      `Search for EXACTLY ${config.articleCount} news articles from the last 24 hours about: ${topicList}. ` +
      `Return exactly ${config.articleCount} articles, not fewer and not more.`;
    if (config.customQuery) {
      instruction += ` Specifically focus on: ${config.customQuery}.`;
    }
    if (config.sources && config.sources.length > 0) {
      instruction += ` Prefer these sources: ${config.sources.join(', ')}.`;
    }
    if (config.excludeTopics) {
      instruction += ` Exclude any articles about: ${config.excludeTopics}.`;
    }
    instruction +=
      ` Each article must include: headline (string), source (publication name, no URL), ` +
      `summary (exactly 2 sentences capturing why the story matters), ` +
      `and url (the DIRECT permalink to the article page, not the publication homepage and not a search-results URL). ` +
      `Strict content rules for every field: ` +
      `(1) NO citation markers of any kind — no [1], [2], [^1], no bracketed numbers, no superscripts; ` +
      `(2) NO arrow characters — no ↗ ↘ → ← ⇒ or any U+2190–U+21FF arrow glyph; ` +
      `(3) NO trailing reference symbols like "(Source)" or "[Reuters]"; ` +
      `(4) The "url" field must start with https:// and point to the specific article, not a section page or homepage; ` +
      `(5) The "source" field is the publication name only, e.g. "Reuters", not a URL.`;
    return instruction;
  },
};
