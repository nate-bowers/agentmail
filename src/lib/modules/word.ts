import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  difficulty: z.enum(['everyday', 'advanced', 'obscure']),
  topic: z.string().max(80).optional(),
});

export type WordConfig = z.infer<typeof configSchema>;

export const wordModule: ModuleDefinition<typeof configSchema> = {
  type: 'word_of_day',
  label: 'Word of the Day',
  description: 'An interesting word with definition, etymology, and example.',
  icon: 'BookOpen',
  defaultConfig: {
    difficulty: 'advanced',
  } satisfies WordConfig,
  configSchema,
  buildSearchInstruction(config) {
    let instruction =
      `Generate a ${config.difficulty} English word of the day. Return a word that is ` +
      `genuinely interesting and worth knowing. Include: the word, its part of speech, a clear ` +
      `definition, its etymology or origin story in one sentence, and a vivid example sentence ` +
      `that shows it in natural use. Do not use extremely common words. Do not use the same word twice in a week.`;
    if (config.topic) {
      instruction += ` Prefer words related to the topic or domain: ${config.topic}.`;
    }
    return instruction;
  },
};
