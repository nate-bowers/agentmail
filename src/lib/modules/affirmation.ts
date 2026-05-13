import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  focus: z.enum(['general', 'career', 'health', 'relationships', 'creativity', 'resilience']).default('general'),
  tone: z.enum(['gentle', 'direct', 'poetic']).default('gentle'),
  customContext: z.string().max(200).optional(),
});

export type AffirmationConfig = z.infer<typeof configSchema>;

export const affirmationModule: ModuleDefinition<typeof configSchema> = {
  type: 'affirmation',
  label: 'Daily Affirmation',
  description: 'A grounding affirmation to set the tone for your day.',
  icon: 'Heart',
  defaultConfig: {
    focus: 'general',
    tone: 'gentle',
  } satisfies AffirmationConfig,
  configSchema,
  buildSearchInstruction(config) {
    let instruction =
      `Write a daily affirmation with the following parameters: Focus area: ${config.focus}. ` +
      `Tone: ${config.tone} (gentle = warm and nurturing, direct = clear and confident, poetic = metaphorical and lyrical).`;
    if (config.customContext) {
      instruction += ` Personal context to incorporate: ${config.customContext}.`;
    }
    instruction +=
      ` The affirmation should be 2-4 sentences. It should feel personal and specific, not like a generic poster quote. ` +
      `It should be something the reader can internalize and carry through the day. ` +
      `Do not start with 'I am' unless it flows naturally. ` +
      `Avoid clichés like 'you've got this' or 'believe in yourself'.`;
    return instruction;
  },
};
