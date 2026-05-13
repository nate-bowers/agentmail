import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const QUOTE_STYLES = ['stoic', 'motivational', 'philosophical', 'funny'] as const;
export type QuoteStyle = (typeof QUOTE_STYLES)[number];

const configSchema = z.object({
  style: z.enum(QUOTE_STYLES),
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
    return (
      `Generate a ${config.style} quote for today. ` +
      `Return the quote text and the author's full name. ` +
      `If using a real historical quote, verify it is correctly attributed to that person.`
    );
  },
};
