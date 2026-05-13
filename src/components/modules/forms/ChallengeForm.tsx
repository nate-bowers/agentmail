'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type ChallengeConfig } from '@/lib/modules/challenge';
import { RadioCards, OptionalInput } from './FormPrimitives';

const TYPE_OPTIONS = [
  { value: 'creative' as const, label: 'Creative 🎨' },
  { value: 'physical' as const, label: 'Physical 🏃' },
  { value: 'social' as const, label: 'Social 🤝' },
  { value: 'mental' as const, label: 'Mental 🧠' },
  { value: 'random' as const, label: 'Random 🎲' },
];

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function ChallengeForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<ChallengeConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      type: (defaultValues.type as ChallengeConfig['type'] | undefined) ?? 'random',
      difficulty: (defaultValues.difficulty as 'easy' | 'medium' | 'hard' | undefined) ?? 'easy',
      customContext: (defaultValues.customContext as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: ChallengeConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Challenge type</Label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
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
        name="difficulty"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Difficulty</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'easy' as const, label: 'Easy', description: '5–10 min' },
                { value: 'medium' as const, label: 'Medium', description: '30 min' },
                { value: 'hard' as const, label: 'Hard', description: 'All day commitment' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="customContext"
        render={({ field }) => (
          <OptionalInput
            label="Personal context (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. I work from home, I'm an introvert, I'm training for a marathon"
            maxLength={150}
          />
        )}
      />
    </form>
  );
}
