'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type AffirmationConfig } from '@/lib/modules/affirmation';
import { RadioCards, OptionalTextarea } from './FormPrimitives';

const FOCUS_OPTIONS = [
  { value: 'general' as const, label: 'General' },
  { value: 'career' as const, label: 'Career' },
  { value: 'health' as const, label: 'Health' },
  { value: 'relationships' as const, label: 'Relationships' },
  { value: 'creativity' as const, label: 'Creativity' },
  { value: 'resilience' as const, label: 'Resilience' },
];

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function AffirmationForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<AffirmationConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      focus: (defaultValues.focus as AffirmationConfig['focus'] | undefined) ?? 'general',
      tone: (defaultValues.tone as 'gentle' | 'direct' | 'poetic' | undefined) ?? 'gentle',
      customContext: (defaultValues.customContext as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: AffirmationConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="focus"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Focus</Label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map((opt) => (
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
        name="tone"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Tone</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'gentle' as const, label: 'Gentle', emoji: '🤍', description: 'Warm and nurturing' },
                { value: 'direct' as const, label: 'Direct', emoji: '💪', description: 'Clear and confident' },
                { value: 'poetic' as const, label: 'Poetic', emoji: '🌿', description: 'Metaphorical and lyrical' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="customContext"
        render={({ field }) => (
          <div className="space-y-1">
            <OptionalTextarea
              label="Anything going on in your life? (optional)"
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="e.g. I'm going through a career transition, or I've been feeling anxious about a big decision"
              maxLength={200}
            />
            <p className="text-xs text-ink-faint">This helps personalize the affirmation. It&rsquo;s only used to generate your email.</p>
          </div>
        )}
      />
    </form>
  );
}
