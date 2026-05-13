import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  interests: z.array(z.string().max(40)).min(1, 'Add at least one interest').max(4),
  episodeLength: z.enum(['short', 'medium', 'long']),
  specificShow: z.string().max(100).optional(),
  avoidTopics: z.string().max(100).optional(),
});

type PodcastConfig = z.infer<typeof configSchema>;

const lengthDescription: Record<string, string> = {
  short: 'short (under 20 minutes)',
  medium: 'medium (20-45 minutes)',
  long: 'long (over 45 minutes)',
};

export const podcastModule: ModuleDefinition<typeof configSchema> = {
  type: 'podcast',
  label: 'Podcast Pick',
  description: 'A handpicked episode recommendation based on your interests.',
  icon: 'Headphones',
  defaultConfig: {
    interests: ['technology'],
    episodeLength: 'medium',
  } satisfies PodcastConfig,
  configSchema,
  buildSearchInstruction(config) {
    const interestsList = config.interests.join(', ');
    const lengthDesc = lengthDescription[config.episodeLength];
    let instruction =
      `Search for a highly-rated podcast episode released in the last 30 days that would appeal ` +
      `to someone interested in: ${interestsList}. Prefer episodes that are ${lengthDesc}. ` +
      `Return: podcast show name, episode title, approximate length, the host or guest if notable, ` +
      `and a 2-sentence description of why this specific episode is worth listening to. ` +
      `Include a search link or Spotify/Apple Podcasts reference if found.`;
    if (config.specificShow) {
      instruction += ` Prefer episodes from this show if recent ones exist: ${config.specificShow}. Otherwise find the best match.`;
    }
    if (config.avoidTopics) {
      instruction += ` Do not recommend episodes covering: ${config.avoidTopics}.`;
    }
    return instruction;
  },
};
