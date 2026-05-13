'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type OnThisDayConfig } from '@/lib/modules/onthisday';
import { PillSelect, OptionalInput } from './FormPrimitives';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function OnThisDayForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<OnThisDayConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      category: (defaultValues.category as 'any' | 'science' | 'politics' | 'sports' | 'arts' | 'technology' | undefined) ?? 'any',
      regionFocus: (defaultValues.regionFocus as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: OnThisDayConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="category"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Category</Label>
            <PillSelect
              value={field.value}
              onChange={(v) => field.onChange(v as typeof field.value)}
              options={[
                { value: 'any', label: 'Any' },
                { value: 'science', label: 'Science' },
                { value: 'politics', label: 'Politics' },
                { value: 'sports', label: 'Sports' },
                { value: 'arts', label: 'Arts' },
                { value: 'technology', label: 'Technology' },
              ]}
            />
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
            placeholder="e.g. East Asia, Silicon Valley, Ancient Rome, women's history"
            maxLength={80}
          />
        )}
      />
    </form>
  );
}
