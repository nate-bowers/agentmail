'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type PodcastConfig } from '@/lib/modules/podcast';
import { TagInput, RadioCards, OptionalInput } from './FormPrimitives';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function PodcastForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<PodcastConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      interests: (defaultValues.interests as string[] | undefined) ?? ['technology'],
      episodeLength: (defaultValues.episodeLength as 'short' | 'medium' | 'long' | undefined) ?? 'medium',
      specificShow: (defaultValues.specificShow as string | undefined) ?? '',
      avoidTopics: (defaultValues.avoidTopics as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: PodcastConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="interests"
        render={({ field, fieldState }) => (
          <div>
            <TagInput
              values={field.value as string[]}
              onChange={field.onChange}
              placeholder="Type an interest and press Enter…"
              max={4}
              label="Interests"
            />
            {fieldState.error && <p className="mt-1 text-xs text-red-500">{fieldState.error.message}</p>}
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="episodeLength"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Episode length</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'short' as const, label: 'Short', description: 'Under 20 minutes' },
                { value: 'medium' as const, label: 'Medium', description: '20–45 minutes' },
                { value: 'long' as const, label: 'Long', description: '45 minutes+' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="specificShow"
        render={({ field }) => (
          <OptionalInput
            label="Prefer a specific show? (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. Lex Fridman, How I Built This"
            maxLength={100}
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
            placeholder="e.g. politics, crypto, true crime"
            maxLength={100}
          />
        )}
      />
    </form>
  );
}
