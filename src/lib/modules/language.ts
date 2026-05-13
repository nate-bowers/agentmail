import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  targetLanguage: z.string().min(1, 'Enter a language').default('Spanish'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  focus: z.string().max(80).optional(),
});

export type LanguageConfig = z.infer<typeof configSchema>;

export const languageModule: ModuleDefinition<typeof configSchema> = {
  type: 'language',
  label: 'Language Word',
  description: 'Learn a word a day in a language you\'re studying.',
  icon: 'Languages',
  defaultConfig: {
    targetLanguage: 'Spanish',
    level: 'beginner',
  } satisfies LanguageConfig,
  configSchema,
  buildSearchInstruction(config) {
    let instruction =
      `Generate a language learning word of the day for someone studying ${config.targetLanguage} ` +
      `at a ${config.level} level.`;
    if (config.focus) {
      instruction += ` Focus on vocabulary related to: ${config.focus}.`;
    }
    instruction +=
      ` Return: the word in ${config.targetLanguage}, its romanization or pronunciation guide if applicable ` +
      `(e.g. for Japanese, Arabic, Chinese), its part of speech, its English translation, ` +
      `a memory tip or etymology note to help remember it, an example sentence in ${config.targetLanguage}, ` +
      `and the English translation of that example sentence.`;
    return instruction;
  },
};
