import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  category: z.enum(['any', 'science', 'nature', 'history', 'technology', 'psychology']),
});

type FactConfig = z.infer<typeof configSchema>;

export const factModule: ModuleDefinition<typeof configSchema> = {
  type: 'fact',
  label: 'Interesting Fact',
  description: 'One genuinely surprising fact to make you more interesting at dinner.',
  icon: 'Lightbulb',
  defaultConfig: {
    category: 'any',
  } satisfies FactConfig,
  configSchema,
  buildSearchInstruction(config) {
    const categoryStr = config.category === 'any' ? 'any category' : config.category;
    return (
      `Generate or search for one genuinely surprising and verifiable fact in the category: ` +
      `${categoryStr}. The fact should be specific with real numbers or names, not vague. ` +
      `It should be something most people do not know. Return: the fact itself in 1-2 sentences, ` +
      `and a one-sentence explanation of why it is true or what it implies. Do not start with ` +
      `"Did you know". Avoid facts about the human brain percentage myth, the Great Wall from ` +
      `space, or other widely-debunked popular facts.`
    );
  },
};
