'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { configSchema, type QuoteConfig } from '@/lib/modules/quote';
import { RadioCards, OptionalTextarea, OptionalInput } from './FormPrimitives';
import { Label } from '@/components/ui/label';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function QuoteForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<QuoteConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      style: (defaultValues.style as string | undefined) ?? 'stoic',
      customPrompt: (defaultValues.customPrompt as string | undefined) ?? '',
      specificPerson: (defaultValues.specificPerson as string | undefined) ?? '',
    },
  });

  const style = form.watch('style');

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: QuoteConfig) => void)} className="space-y-4">
      <Controller
        control={form.control}
        name="style"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Quote style</Label>
            <RadioCards
              value={field.value as 'stoic' | 'motivational' | 'philosophical' | 'funny' | 'custom'}
              onChange={field.onChange}
              options={[
                { value: 'stoic' as const, label: 'Stoic', emoji: '⚖️' },
                { value: 'motivational' as const, label: 'Motivational', emoji: '🔥' },
                { value: 'philosophical' as const, label: 'Philosophical', emoji: '🧠' },
                { value: 'funny' as const, label: 'Funny', emoji: '😄' },
                { value: 'custom' as const, label: 'Custom ✏️', description: 'Describe exactly what you want' },
              ]}
            />
          </div>
        )}
      />

      {style === 'custom' && (
        <Controller
          control={form.control}
          name="customPrompt"
          render={({ field }) => (
            <OptionalTextarea
              label="Your custom prompt"
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="e.g. A quote about resilience from a female author, or something from Japanese philosophy"
              maxLength={200}
            />
          )}
        />
      )}

      <Controller
        control={form.control}
        name="specificPerson"
        render={({ field }) => (
          <OptionalInput
            label="From a specific person? (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. Marcus Aurelius, Maya Angelou, Feynman"
            maxLength={80}
          />
        )}
      />
    </form>
  );
}
