import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  style: z.string(),
  customPrompt: z.string().max(200).optional(),
  specificPerson: z.string().max(80).optional(),
});

export type QuoteConfig = z.infer<typeof configSchema>;

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
      let instruction = config.customPrompt;
      if (config.specificPerson) {
        instruction += ` Specifically use a quote from: ${config.specificPerson}.`;
      }
      return (
        `${instruction} ` +
        `Return the quote text and the author's full name. ` +
        `If using a real historical quote, verify it is correctly attributed.`
      );
    }
    let instruction = `Generate a ${config.style} quote for today.`;
    if (config.specificPerson) {
      instruction = `Find a ${config.style} quote from ${config.specificPerson}.`;
    }
    return (
      `${instruction} ` +
      `Return the quote text and the author's full name. ` +
      `If using a real historical quote, verify it is correctly attributed to that person.`
    );
  },
};
