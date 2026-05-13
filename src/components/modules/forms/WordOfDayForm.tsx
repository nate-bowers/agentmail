'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type WordConfig } from '@/lib/modules/word';
import { RadioCards, OptionalInput } from './FormPrimitives';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function WordOfDayForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<WordConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      difficulty: (defaultValues.difficulty as 'everyday' | 'advanced' | 'obscure' | undefined) ?? 'advanced',
      topic: (defaultValues.topic as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: WordConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="difficulty"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Difficulty</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'everyday' as const, label: 'Everyday', description: 'Common but precise words' },
                { value: 'advanced' as const, label: 'Advanced', description: 'Expand your vocabulary' },
                { value: 'obscure' as const, label: 'Obscure', description: 'Rare and remarkable words' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="topic"
        render={({ field }) => (
          <OptionalInput
            label="Topic or domain (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. medicine, architecture, sailing, philosophy"
            maxLength={80}
          />
        )}
      />
    </form>
  );
}
