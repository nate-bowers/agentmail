import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  type: z.enum(['creative', 'physical', 'social', 'mental', 'random']).default('random'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
  customContext: z.string().max(150).optional(),
});

export type ChallengeConfig = z.infer<typeof configSchema>;

export const challengeModule: ModuleDefinition<typeof configSchema> = {
  type: 'challenge',
  label: 'Daily Challenge',
  description: 'A small, fun challenge to make today more interesting.',
  icon: 'Zap',
  defaultConfig: {
    type: 'random',
    difficulty: 'easy',
  } satisfies ChallengeConfig,
  configSchema,
  buildSearchInstruction(config) {
    let instruction = `Generate a daily challenge of type: ${config.type}. Difficulty: ${config.difficulty}.`;
    if (config.customContext) {
      instruction += ` Context about this person: ${config.customContext}.`;
    }
    instruction +=
      ` Challenge types: creative = an artistic or imaginative task (write a haiku, sketch something, rearrange a space); ` +
      `physical = a movement-based challenge (not a full workout — something quick and fun); ` +
      `social = an interaction challenge (give a genuine compliment, start a conversation with a stranger, reach out to someone you haven't spoken to in a while); ` +
      `mental = a thinking challenge (solve a logic puzzle, learn one new thing about a topic, read one Wikipedia article on a random subject); ` +
      `random = any type, chosen for variety. ` +
      `Return: a challenge title, 2-3 sentences describing the exact challenge and how to complete it, ` +
      `and a one-sentence 'why this matters' framing. Make it feel genuinely fun and achievable, not like homework.`;
    return instruction;
  },
};
