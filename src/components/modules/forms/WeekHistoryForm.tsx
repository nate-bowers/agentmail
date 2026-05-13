'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type WeekHistoryConfig } from '@/lib/modules/weekhistory';
import { OptionalInput } from './FormPrimitives';

const CATEGORY_OPTIONS = [
  { value: 'any' as const, label: 'Any' },
  { value: 'science' as const, label: 'Science' },
  { value: 'politics' as const, label: 'Politics' },
  { value: 'sports' as const, label: 'Sports' },
  { value: 'arts' as const, label: 'Arts' },
  { value: 'technology' as const, label: 'Technology' },
  { value: 'exploration' as const, label: 'Exploration' },
];

const ERA_OPTIONS = [
  { value: 'any' as const, label: 'Any' },
  { value: 'ancient' as const, label: 'Ancient (pre-500AD)' },
  { value: 'medieval' as const, label: 'Medieval (500–1500)' },
  { value: 'modern' as const, label: 'Modern (1500–1900)' },
  { value: 'contemporary' as const, label: 'Contemporary (1900–present)' },
];

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function WeekHistoryForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<WeekHistoryConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      category: (defaultValues.category as WeekHistoryConfig['category'] | undefined) ?? 'any',
      era: (defaultValues.era as WeekHistoryConfig['era'] | undefined) ?? 'any',
      regionFocus: (defaultValues.regionFocus as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: WeekHistoryConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="category"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => field.onChange(opt.value)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    field.value === opt.value
                      ? 'bg-brand-purple text-white'
                      : 'border border-surface-border bg-white text-ink hover:border-brand-purple'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="era"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Era</Label>
            <div className="flex flex-wrap gap-2">
              {ERA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => field.onChange(opt.value)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    field.value === opt.value
                      ? 'bg-brand-purple text-white'
                      : 'border border-surface-border bg-white text-ink hover:border-brand-purple'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="regionFocus"
        render={({ field }) => (
          <OptionalInput
            label="Region or focus (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. East Asia, Latin America, women's history"
            maxLength={80}
          />
        )}
      />
    </form>
  );
}
