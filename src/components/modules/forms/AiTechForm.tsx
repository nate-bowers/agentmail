'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { configSchema, type AiTechConfig } from '@/lib/modules/aitech';
import { RadioCards, OptionalInput } from './FormPrimitives';
import { PresetChipPicker } from '@/components/modules/PresetChipPicker';
import { AITECH_SUBTOPIC_PRESETS } from '@/lib/modules/presets';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function AiTechForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<AiTechConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      subtopics: (defaultValues.subtopics as string[] | undefined) ?? ['AI models', 'startups'],
      depth: (defaultValues.depth as 'headlines' | 'analysis' | undefined) ?? 'headlines',
      customFocus: (defaultValues.customFocus as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: AiTechConfig) => void)} className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg bg-brand-purple-light p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
        <p className="text-sm text-brand-purple">This module uses 2 credits due to its depth.</p>
      </div>

      <Controller
        control={form.control}
        name="subtopics"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">
              Subtopics <span className="font-normal text-ink-faint">(pick up to 4)</span>
            </Label>
            <PresetChipPicker
              presets={AITECH_SUBTOPIC_PRESETS}
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
              max={4}
              customPlaceholder="Add a subtopic…"
            />
            {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="depth"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Depth</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'headlines' as const, label: 'Headlines', emoji: '⚡', description: 'Quick titles and one-liners' },
                { value: 'analysis' as const, label: 'Analysis', emoji: '🔍', description: 'Full breakdown of each story' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="customFocus"
        render={({ field }) => (
          <OptionalInput
            label="Custom focus (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. Only GPU supply chain news, or focus on European AI regulation"
            maxLength={150}
          />
        )}
      />
    </form>
  );
}
