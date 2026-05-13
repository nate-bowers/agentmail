'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type FactConfig } from '@/lib/modules/fact';
import { PillSelect, OptionalTextarea } from './FormPrimitives';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function FactForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<FactConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      category: (defaultValues.category as 'any' | 'science' | 'nature' | 'history' | 'technology' | 'psychology' | undefined) ?? 'any',
      customRequest: (defaultValues.customRequest as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: FactConfig) => void)} className="space-y-5">
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
                { value: 'nature', label: 'Nature' },
                { value: 'history', label: 'History' },
                { value: 'technology', label: 'Technology' },
                { value: 'psychology', label: 'Psychology' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="customRequest"
        render={({ field }) => (
          <OptionalTextarea
            label="More specific? (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. facts about deep ocean creatures, or facts involving surprising numbers"
            maxLength={150}
          />
        )}
      />
    </form>
  );
}
