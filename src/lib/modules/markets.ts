import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  symbols: z
    .array(z.string().min(1).toUpperCase())
    .min(1, 'Add at least one symbol')
    .max(10, 'Maximum 10 symbols'),
  showCommentary: z.boolean().default(false),
});

export type MarketsConfig = z.infer<typeof configSchema>;

export const marketsModule: ModuleDefinition<typeof configSchema> = {
  type: 'markets',
  label: 'Markets',
  description: 'Price and daily change for stocks, ETFs, and crypto.',
  icon: 'TrendingUp',
  defaultConfig: {
    symbols: ['SPY', 'BTC-USD', 'NVDA'],
    showCommentary: false,
  } satisfies MarketsConfig,
  configSchema,
  buildSearchInstruction(config) {
    const symbolList = config.symbols.join(', ');
    let instruction =
      `Search for the current price and today's percentage change for the following symbols: ${symbolList}. ` +
      `For each symbol return: the ticker symbol, current price in USD, and today's percentage change ` +
      `(positive or negative). If a symbol is a cryptocurrency, note that as well.`;
    if (config.showCommentary) {
      instruction +=
        ` Also include a brief 1-sentence market commentary on the overall mood (e.g. broad sell-off, ` +
        `tech rally, mixed session) to give context to the numbers.`;
    }
    return instruction;
  },
};
