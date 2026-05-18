'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { configSchema, type WeatherConfig } from '@/lib/modules/weather';
import { RadioCards, Toggle } from './FormPrimitives';
import { SpecificityTooltip } from '@/components/modules/SpecificityTooltip';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  disableHints?: boolean;
}

// Stored locations may be plain strings (legacy/incoming) or fully geocoded
// objects (post-save). The form renders an editable plain-text input either
// way, surfacing the display_name when present so the user sees the resolved
// location after the API geocoded it.
type StoredLocation = string | { input?: string; display_name?: string };
function readLocationLabel(loc: StoredLocation): string {
  if (typeof loc === 'string') return loc;
  return loc.display_name ?? loc.input ?? '';
}

export function WeatherForm({ defaultValues, onSubmit, disableHints }: Props) {
  const initialLocations = ((defaultValues.locations as StoredLocation[] | undefined) ?? ['New York, NY'])
    .map(readLocationLabel)
    .filter((s) => s.length > 0);

  const form = useForm<WeatherConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      locations: initialLocations.length > 0 ? initialLocations : ['New York, NY'],
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
          // After save, items may be geocoded objects. Normalize to strings for editing.
          const locs = ((field.value ?? []) as StoredLocation[]).map(readLocationLabel);
          function update(idx: number, val: string) {
            const next = locs.map((l, i) => (i === idx ? val : l));
            field.onChange(next);
          }
          function remove(idx: number) { field.onChange(locs.filter((_, i) => i !== idx)); }
          function add() { if (locs.length < 5) field.onChange([...locs, '']); }
          return (
            <SpecificityTooltip
              fieldId="weather.locations"
              disabled={disableHints}
              message="Include the state or country. &lsquo;Springfield, IL&rsquo; or &lsquo;Paris, France&rsquo; beats &lsquo;Springfield&rsquo; or &lsquo;Paris&rsquo;."
            >
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
            </SpecificityTooltip>
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
