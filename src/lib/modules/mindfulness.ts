import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  style: z.string(),
  customTheme: z.string().max(200).optional(),
});

type MindfulnessConfig = z.infer<typeof configSchema>;

export const mindfulnessModule: ModuleDefinition<typeof configSchema> = {
  type: 'mindfulness',
  label: 'Mindfulness Prompt',
  description: 'A daily reflection question or intention to start your morning grounded.',
  icon: 'Brain',
  defaultConfig: {
    style: 'reflection',
  } satisfies MindfulnessConfig,
  configSchema,
  buildSearchInstruction(config) {
    if (config.style === 'custom' && config.customTheme) {
      return (
        `Generate a mindfulness prompt around this specific theme: ${config.customTheme}. ` +
        `Keep it to 2-3 sentences, grounded and actionable. Do not start with "Take a moment to" ` +
        `or "Think about" — be more creative with the opening.`
      );
    }
    return (
      `Generate a single ${config.style} prompt for morning mindfulness. It should be ` +
      `thoughtful, specific, and non-generic. A reflection prompt asks the user to examine ` +
      `something about themselves or their life. An intention prompt sets a theme or focus ` +
      `for the day. A gratitude prompt surfaces something specific to appreciate. A challenge ` +
      `prompt offers a small meaningful action to take today. Write 2-3 sentences max. Do not ` +
      `start with "Take a moment to" or "Think about" — be more creative with the opening.`
    );
  },
};
