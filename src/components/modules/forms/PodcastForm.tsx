'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type PodcastConfig } from '@/lib/modules/podcast';
import { RadioCards, OptionalInput } from './FormPrimitives';
import { PresetChipPicker } from '@/components/modules/PresetChipPicker';
import { PODCAST_INTEREST_PRESETS } from '@/lib/modules/presets';

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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">
              Interests <span className="font-normal text-ink-faint">(pick up to 4)</span>
            </Label>
            <PresetChipPicker
              presets={PODCAST_INTEREST_PRESETS}
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
              max={4}
              customPlaceholder="Add an interest…"
              normalize={(v) => v.trim().toLowerCase()}
            />
            {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
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
