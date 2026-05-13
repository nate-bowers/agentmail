import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

const configSchema = z.object({
  baseCurrency: z.string().length(3, 'Must be a 3-letter currency code'),
  targetCurrencies: z.array(z.string().length(3, 'Must be a 3-letter currency code')).min(1).max(5),
});

type CurrencyConfig = z.infer<typeof configSchema>;

export const currencyModule: ModuleDefinition<typeof configSchema> = {
  type: 'currency',
  label: 'Currency Rates',
  description: 'Live exchange rates for the currency pairs you care about.',
  icon: 'ArrowLeftRight',
  defaultConfig: {
    baseCurrency: 'USD',
    targetCurrencies: ['EUR', 'GBP', 'JPY'],
  } satisfies CurrencyConfig,
  configSchema,
  buildSearchInstruction(config) {
    const base = config.baseCurrency.toUpperCase();
    const targets = config.targetCurrencies.map((c) => c.toUpperCase()).join(', ');
    return (
      `Search for today's live exchange rates. Base currency: ${base}. ` +
      `Return the current exchange rate for each of these target currencies: ${targets}. ` +
      `For each pair, include the rate and whether it is up or down compared to yesterday. ` +
      `Format as: 1 ${base} = X [target].`
    );
  },
};
