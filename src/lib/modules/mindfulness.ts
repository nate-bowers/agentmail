import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  // Canonical values pulled from MindfulnessForm.tsx RadioCards options.
  style: z.enum(['reflection', 'intention', 'gratitude', 'challenge', 'custom']),
  theme: z.string().max(200).optional(),
  customPrompt: z.string().max(200).optional(),
});

export type MindfulnessConfig = z.infer<typeof configSchema>;

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
    let base: string;
    if (config.style === 'custom' && config.theme) {
      base =
        `Generate a mindfulness prompt around this specific theme: ${config.theme}. ` +
        `Keep it to 2-3 sentences, grounded and actionable. Do not start with "Take a moment to" ` +
        `or "Think about" — be more creative with the opening.`;
    } else {
      base =
        `Generate a single ${config.style} prompt for morning mindfulness. It should be ` +
        `thoughtful, specific, and non-generic. A reflection prompt asks the user to examine ` +
        `something about themselves or their life. An intention prompt sets a theme or focus ` +
        `for the day. A gratitude prompt surfaces something specific to appreciate. A challenge ` +
        `prompt offers a small meaningful action to take today. Write 2-3 sentences max. Do not ` +
        `start with "Take a moment to" or "Think about" — be more creative with the opening.`;
    }
    if (config.customPrompt) {
      base += ` Additional context from the user: ${config.customPrompt}`;
    }
    return base;
  },
};
