import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  topics: z
    .array(z.string().min(1))
    .min(1, 'Add at least one topic')
    .max(5, 'Maximum 5 topics'),
  customQuery: z.string().max(200).optional(),
  sources: z.array(z.string()).max(3).optional(),
  articleCount: z.union([z.literal(3), z.literal(5), z.literal(10)]).default(5),
  excludeTopics: z.string().max(100).optional(),
});

type NewsConfig = z.infer<typeof configSchema>;

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
      `Search for the top ${config.articleCount} news articles from the last 24 hours about: ${topicList}.`;
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
      ` For each article return: headline, source name, publication time if available, ` +
      `and a 2-sentence summary that captures why this story matters.`;
    return instruction;
  },
};
