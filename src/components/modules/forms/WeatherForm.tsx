'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { configSchema, type WeatherConfig } from '@/lib/modules/weather';
import { RadioCards, Toggle } from './FormPrimitives';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function WeatherForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<WeatherConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      locations: (defaultValues.locations as string[] | undefined) ?? ['New York, NY'],
      units: (defaultValues.units as 'imperial' | 'metric' | undefined) ?? 'imperial',
      extended: (defaultValues.extended as boolean | undefined) ?? false,
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: WeatherConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="locations"
        render={({ field, fieldState }) => {
          const locs = field.value as string[];
          function update(idx: number, val: string) {
            const next = locs.map((l, i) => (i === idx ? val : l));
            field.onChange(next);
          }
          function remove(idx: number) { field.onChange(locs.filter((_, i) => i !== idx)); }
          function add() { if (locs.length < 5) field.onChange([...locs, '']); }
          return (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-ink">Locations</Label>
              {locs.map((loc, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input value={loc} onChange={(e) => update(idx, e.target.value)} placeholder="e.g. Nashville, TN" />
                  {locs.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}><X className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              {locs.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={add}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add location
                </Button>
              )}
              {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
            </div>
          );
        }}
      />

      <Controller
        control={form.control}
        name="units"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Temperature units</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'imperial' as const, label: 'Imperial', emoji: '🇺🇸', description: 'Fahrenheit' },
                { value: 'metric' as const, label: 'Metric', emoji: '🌍', description: 'Celsius' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="extended"
        render={({ field }) => (
          <Toggle
            label="Extended forecast"
            description="Show a 5-day outlook instead of just today"
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </form>
  );
}
