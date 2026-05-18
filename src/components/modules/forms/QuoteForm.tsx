'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { configSchema, type QuoteConfig } from '@/lib/modules/quote';
import { RadioCards, OptionalTextarea, OptionalInput } from './FormPrimitives';
import { Label } from '@/components/ui/label';
import { SpecificityTooltip } from '@/components/modules/SpecificityTooltip';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  disableHints?: boolean;
}

const QUOTE_STYLES = ['stoic', 'motivational', 'philosophical', 'funny', 'custom'] as const;
type QuoteStyle = (typeof QUOTE_STYLES)[number];

function coerceQuoteStyle(value: unknown): QuoteStyle {
  return QUOTE_STYLES.includes(value as QuoteStyle) ? (value as QuoteStyle) : 'stoic';
}

export function QuoteForm({ defaultValues, onSubmit, disableHints }: Props) {
  const form = useForm<QuoteConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      style: coerceQuoteStyle(defaultValues.style),
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
            <SpecificityTooltip
              fieldId="quote.customPrompt"
              disabled={disableHints}
              message="Specific is better. &lsquo;Stoic philosophers, especially Marcus Aurelius&rsquo; beats &lsquo;inspirational&rsquo;."
            >
              <OptionalTextarea
                label="Your custom prompt"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="e.g. A quote about resilience from a female author, or something from Japanese philosophy"
                maxLength={200}
              />
            </SpecificityTooltip>
          )}
        />
      )}

      <Controller
        control={form.control}
        name="specificPerson"
        render={({ field }) => (
          <SpecificityTooltip
            fieldId="quote.specificPerson"
            disabled={disableHints}
            message="Name a specific author or thinker. &lsquo;Marcus Aurelius&rsquo; beats &lsquo;a philosopher&rsquo;."
          >
            <OptionalInput
              label="From a specific person? (optional)"
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="e.g. Marcus Aurelius, Maya Angelou, Feynman"
              maxLength={80}
            />
          </SpecificityTooltip>
        )}
      />
    </form>
  );
}
