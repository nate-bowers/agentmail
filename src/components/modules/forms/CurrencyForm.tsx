'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { configSchema, type CurrencyConfig } from '@/lib/modules/currency';
import { MultiInput } from './FormPrimitives';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function CurrencyForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<CurrencyConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      baseCurrency: (defaultValues.baseCurrency as string | undefined) ?? 'USD',
      targetCurrencies: (defaultValues.targetCurrencies as string[] | undefined) ?? ['EUR', 'GBP'],
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: CurrencyConfig) => void)} className="space-y-4">
      <Controller
        control={form.control}
        name="baseCurrency"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Base currency</Label>
            <Input
              value={field.value}
              onChange={(e) => field.onChange(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="USD"
              className="w-24 font-mono uppercase"
              maxLength={3}
            />
            {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="targetCurrencies"
        render={({ field, fieldState }) => {
          const targets = field.value as string[];
          const withEmpty = targets.length === 0 ? [''] : targets;
          return (
            <div className="space-y-2">
              <MultiInput
                values={withEmpty}
                onChange={(v) => field.onChange(v.map((c) => c.toUpperCase().slice(0, 3)))}
                placeholder="e.g. EUR"
                max={5}
                label="Target currencies"
                uppercase
              />
              {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
            </div>
          );
        }}
      />
    </form>
  );
}
