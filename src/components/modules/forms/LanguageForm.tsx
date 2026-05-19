'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { configSchema, type LanguageConfig } from '@/lib/modules/language';
import { RadioCards, OptionalInput } from './FormPrimitives';
import { SpecificityTooltip } from '@/components/modules/SpecificityTooltip';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  disableHints?: boolean;
}

export function LanguageForm({ defaultValues, onSubmit, disableHints }: Props) {
  const form = useForm<LanguageConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      targetLanguage: (defaultValues.targetLanguage as string | undefined) ?? 'Spanish',
      level: (defaultValues.level as 'beginner' | 'intermediate' | 'advanced' | undefined) ?? 'beginner',
      focus: (defaultValues.focus as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: LanguageConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="targetLanguage"
        render={({ field, fieldState }) => (
          <SpecificityTooltip
            fieldId="language.targetLanguage"
            disabled={disableHints}
            message="Tell us what you&rsquo;re using it for. &lsquo;Conversational Spanish for travel&rsquo; beats &lsquo;Spanish.&rsquo;"
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">Language you&rsquo;re learning</Label>
              <Input
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder="e.g. Spanish, Japanese, French, Mandarin"
              />
              {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
            </div>
          </SpecificityTooltip>
        )}
      />

      <Controller
        control={form.control}
        name="level"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Level</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'beginner' as const, label: 'Beginner' },
                { value: 'intermediate' as const, label: 'Intermediate' },
                { value: 'advanced' as const, label: 'Advanced' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="focus"
        render={({ field }) => (
          <SpecificityTooltip
            fieldId="language.focus"
            disabled={disableHints}
            message="Concrete domains beat broad ones. &lsquo;Restaurant Spanish for ordering and asking allergens&rsquo; beats &lsquo;food.&rsquo;"
          >
            <OptionalInput
              label="Vocabulary focus (optional)"
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="e.g. travel, business, food and cooking, emotions"
              maxLength={80}
            />
          </SpecificityTooltip>
        )}
      />
    </form>
  );
}
