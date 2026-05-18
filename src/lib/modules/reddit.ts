import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  subreddits: z.array(z.string().min(1).max(40, 'Subreddit name is too long')).min(1, 'Add at least one subreddit').max(5),
  postCount: z.union([z.literal(3), z.literal(5)]).default(3),
  sortBy: z.enum(['hot', 'top']).default('hot'),
});

export type RedditConfig = z.infer<typeof configSchema>;

export const redditModule: ModuleDefinition<typeof configSchema> = {
  type: 'reddit',
  label: 'Reddit Digest',
  description: 'Top posts from the subreddits you follow.',
  icon: 'MessageSquare',
  defaultConfig: {
    subreddits: ['todayilearned'],
    postCount: 3,
    sortBy: 'hot',
  } satisfies RedditConfig,
  configSchema,
  buildSearchInstruction(config) {
    const subList = config.subreddits.join(', ');
    return (
      `Search Reddit for the current ${config.sortBy} posts from these subreddits: ${subList}. ` +
      `Return the top ${config.postCount} posts across all listed subreddits combined ` +
      `(not ${config.postCount} per subreddit). ` +
      `For each post return: subreddit name, post title, a one-sentence summary of what the post is about ` +
      `or what makes it interesting, approximate upvote count or engagement level if visible, and the Reddit post URL. ` +
      `Skip any posts that are purely image memes with no substance.`
    );
  },
};
