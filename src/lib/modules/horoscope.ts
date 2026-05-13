import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  sign: z.enum([
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ]).default('leo'),
  style: z.enum(['classic', 'modern', 'humorous']).default('modern'),
});

export type HoroscopeConfig = z.infer<typeof configSchema>;

export const horoscopeModule: ModuleDefinition<typeof configSchema> = {
  type: 'horoscope',
  label: 'Daily Horoscope',
  description: 'Your daily horoscope — take it as seriously as you like.',
  icon: 'Stars',
  defaultConfig: {
    sign: 'leo',
    style: 'modern',
  } satisfies HoroscopeConfig,
  configSchema,
  buildSearchInstruction(config) {
    return (
      `Search for or generate today's horoscope for ${config.sign} in a ${config.style} style. ` +
      `Classic style: traditional horoscope language, celestial references, mystical tone. ` +
      `Modern style: grounded, practical interpretation, feels like life advice wrapped in cosmic framing. ` +
      `Humorous style: playful, self-aware, does not take itself too seriously. ` +
      `Return: the sign name, today's date, a 3-4 sentence horoscope, and a one-line 'focus for today' at the end. ` +
      `Note: this is for entertainment purposes.`
    );
  },
};
