import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  style: z.string(),
  customPrompt: z.string().max(200).optional(),
});

type QuoteConfig = z.infer<typeof configSchema>;

export const quoteModule: ModuleDefinition<typeof configSchema> = {
  type: 'quote',
  label: 'Quote',
  description: 'A daily quote in a style that resonates with you.',
  icon: 'Quote',
  defaultConfig: {
    style: 'stoic',
  } satisfies QuoteConfig,
  configSchema,
  buildSearchInstruction(config) {
    if (config.style === 'custom' && config.customPrompt) {
      return (
        `${config.customPrompt} ` +
        `Return the quote text and the author's full name. ` +
        `If using a real historical quote, verify it is correctly attributed.`
      );
    }
    return (
      `Generate a ${config.style} quote for today. ` +
      `Return the quote text and the author's full name. ` +
      `If using a real historical quote, verify it is correctly attributed to that person.`
    );
  },
};
