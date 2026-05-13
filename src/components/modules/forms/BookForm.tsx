'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type BookConfig } from '@/lib/modules/book';
import { TagInput, RadioCards, OptionalInput } from './FormPrimitives';

const LENGTH_OPTIONS = [
  { value: 'short' as const, label: 'Short (<200p)' },
  { value: 'medium' as const, label: 'Medium (200–350p)' },
  { value: 'long' as const, label: 'Long (350p+)' },
  { value: 'any' as const, label: 'Any' },
];

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function BookForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<BookConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      genres: (defaultValues.genres as string[] | undefined) ?? [],
      format: (defaultValues.format as 'fiction' | 'nonfiction' | 'either' | undefined) ?? 'either',
      length: (defaultValues.length as 'short' | 'medium' | 'long' | 'any' | undefined) ?? 'any',
      mood: (defaultValues.mood as string | undefined) ?? 'inspiring',
      avoidTopics: (defaultValues.avoidTopics as string | undefined) ?? '',
      customRequest: (defaultValues.customRequest as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: BookConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="genres"
        render={({ field }) => (
          <TagInput
            label="Genres"
            values={field.value ?? []}
            onChange={field.onChange}
            placeholder="Add a genre and press Enter"
            max={4}
          />
        )}
      />
      <p className="!mt-1 text-xs text-ink-faint">e.g. history, sci-fi, biography, business</p>

      <Controller
        control={form.control}
        name="format"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Format</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'fiction' as const, label: 'Fiction' },
                { value: 'nonfiction' as const, label: 'Nonfiction' },
                { value: 'either' as const, label: 'Either' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="length"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Length</Label>
            <div className="flex flex-wrap gap-2">
              {LENGTH_OPTIONS.map((opt) => (
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
        name="mood"
        render={({ field }) => (
          <OptionalInput
            label="Mood"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. inspiring, thought-provoking, escapist, calming"
            maxLength={80}
          />
        )}
      />

      <Controller
        control={form.control}
        name="avoidTopics"
        render={({ field }) => (
          <OptionalInput
            label="Avoid topics (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. war, politics, self-help"
            maxLength={100}
          />
        )}
      />

      <Controller
        control={form.control}
        name="customRequest"
        render={({ field }) => (
          <OptionalInput
            label="Custom request (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. Something like Sapiens, or a debut novel from the last 5 years"
            maxLength={150}
          />
        )}
      />
    </form>
  );
}
