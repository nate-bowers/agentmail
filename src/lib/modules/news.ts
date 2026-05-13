import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  topics: z
    .array(z.string().min(1))
    .min(1, 'Add at least one topic')
    .max(10, 'Maximum 10 topics'),
  count: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5),
});

type NewsConfig = z.infer<typeof configSchema>;

export const newsModule: ModuleDefinition<typeof configSchema> = {
  type: 'news',
  label: 'News',
  description: 'Top headlines from the last 24 hours on topics you choose.',
  icon: 'Newspaper',
  defaultConfig: {
    topics: ['technology', 'business'],
    count: 5,
  } satisfies NewsConfig,
  configSchema,
  buildSearchInstruction(config) {
    const topicList = config.topics.join(', ');
    return (
      `Search for the top ${config.count} news headlines from the last 24 hours about the following topics: ${topicList}. ` +
      `For each headline return: the headline text, the source name, and a one-sentence summary of the story.`
    );
  },
};
