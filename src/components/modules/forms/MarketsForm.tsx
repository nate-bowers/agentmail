'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type MarketsConfig } from '@/lib/modules/markets';
import { Toggle } from './FormPrimitives';
import { PresetChipPicker } from '@/components/modules/PresetChipPicker';
import { MARKETS_SYMBOL_PRESETS } from '@/lib/modules/presets';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function MarketsForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<MarketsConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      symbols: (defaultValues.symbols as string[] | undefined) ?? ['SPY', 'BTC-USD', 'NVDA'],
      showCommentary: (defaultValues.showCommentary as boolean | undefined) ?? false,
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: MarketsConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="symbols"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">
              Symbols <span className="font-normal text-ink-faint">(pick up to 10)</span>
            </Label>
            <PresetChipPicker
              presets={MARKETS_SYMBOL_PRESETS}
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
              max={10}
              customPlaceholder="Add a ticker (e.g. BRK.B, IWM)…"
              // Tickers are always uppercase, and Markets schema also runs
              // toUpperCase at parse time, so normalizing here keeps the UI
              // consistent with what gets saved.
              normalize={(v) => v.trim().toUpperCase()}
            />
            {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="showCommentary"
        render={({ field }) => (
          <Toggle
            label="Market commentary"
            description="Add a brief sentence on the overall market mood"
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </form>
  );
}
