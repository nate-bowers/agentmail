'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type HoroscopeConfig } from '@/lib/modules/horoscope';
import { RadioCards } from './FormPrimitives';

const SIGNS = [
  { value: 'aries', label: 'Aries ♈' },
  { value: 'taurus', label: 'Taurus ♉' },
  { value: 'gemini', label: 'Gemini ♊' },
  { value: 'cancer', label: 'Cancer ♋' },
  { value: 'leo', label: 'Leo ♌' },
  { value: 'virgo', label: 'Virgo ♍' },
  { value: 'libra', label: 'Libra ♎' },
  { value: 'scorpio', label: 'Scorpio ♏' },
  { value: 'sagittarius', label: 'Sagittarius ♐' },
  { value: 'capricorn', label: 'Capricorn ♑' },
  { value: 'aquarius', label: 'Aquarius ♒' },
  { value: 'pisces', label: 'Pisces ♓' },
] as const;

type Sign = typeof SIGNS[number]['value'];

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function HoroscopeForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<HoroscopeConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      sign: (defaultValues.sign as HoroscopeConfig['sign'] | undefined) ?? 'leo',
      style: (defaultValues.style as 'classic' | 'modern' | 'humorous' | undefined) ?? 'modern',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: HoroscopeConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="sign"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Your sign</Label>
            <div className="grid grid-cols-4 gap-2">
              {SIGNS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => field.onChange(s.value as Sign)}
                  className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                    field.value === s.value
                      ? 'border-brand-purple bg-brand-purple text-white font-medium'
                      : 'border-surface-border bg-white text-ink hover:border-brand-purple hover:bg-brand-purple-light'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="style"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Style</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'classic' as const, label: 'Classic', emoji: '🔮', description: 'Traditional and mystical' },
                { value: 'modern' as const, label: 'Modern', emoji: '✨', description: 'Practical life guidance' },
                { value: 'humorous' as const, label: 'Humorous', emoji: '😄', description: 'Lighthearted and self-aware' },
              ]}
            />
          </div>
        )}
      />
    </form>
  );
}
