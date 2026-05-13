'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type MindfulnessConfig } from '@/lib/modules/mindfulness';
import { RadioCards, OptionalTextarea } from './FormPrimitives';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function MindfulnessForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<MindfulnessConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      style: (defaultValues.style as string | undefined) ?? 'reflection',
      theme: (defaultValues.theme as string | undefined) ?? (defaultValues.customTheme as string | undefined) ?? '',
      customPrompt: (defaultValues.customPrompt as string | undefined) ?? '',
    },
  });

  const style = form.watch('style');

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: MindfulnessConfig) => void)} className="space-y-4">
      <Controller
        control={form.control}
        name="style"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Style</Label>
            <RadioCards
              value={field.value as 'reflection' | 'intention' | 'gratitude' | 'challenge' | 'custom'}
              onChange={field.onChange}
              options={[
                { value: 'reflection' as const, label: 'Reflection', description: 'Examine something about yourself' },
                { value: 'intention' as const, label: 'Intention', description: 'Set a theme for the day' },
                { value: 'gratitude' as const, label: 'Gratitude', description: 'Surface something to appreciate' },
                { value: 'challenge' as const, label: 'Challenge', description: 'A small action to take today' },
                { value: 'custom' as const, label: 'Custom ✏️', description: 'Write your own theme' },
              ]}
            />
          </div>
        )}
      />

      {style === 'custom' && (
        <Controller
          control={form.control}
          name="theme"
          render={({ field }) => (
            <OptionalTextarea
              label="Your theme"
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="e.g. Focus on patience, or something related to career decisions"
              maxLength={200}
            />
          )}
        />
      )}

      <Controller
        control={form.control}
        name="customPrompt"
        render={({ field }) => (
          <OptionalTextarea
            label="Additional guidance (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. Keep it related to work, or make it feel more grounded than spiritual"
            maxLength={200}
          />
        )}
      />
    </form>
  );
}
