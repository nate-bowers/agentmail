'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { configSchema, type EventsConfig } from '@/lib/modules/events';
import { RadioCards, OptionalInput } from './FormPrimitives';
import { SpecificityTooltip } from '@/components/modules/SpecificityTooltip';
import { PresetChipPicker } from '@/components/modules/PresetChipPicker';
import { LOCAL_EVENTS_CATEGORY_PRESETS } from '@/lib/modules/presets';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  disableHints?: boolean;
}

// city may be stored as a plain string (legacy) or as a geocoded object
// (post-save). Convert either to a string for the editable input.
type StoredCity = string | { input?: string; display_name?: string };
function readCityLabel(city: StoredCity | undefined): string {
  if (!city) return '';
  if (typeof city === 'string') return city;
  return city.display_name ?? city.input ?? '';
}

export function LocalEventsForm({ defaultValues, onSubmit, disableHints }: Props) {
  const form = useForm<EventsConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      city: readCityLabel(defaultValues.city as StoredCity | undefined),
      categories: (defaultValues.categories as string[] | undefined) ?? ['music', 'food & drink'],
      radius: (defaultValues.radius as 'walking' | 'city' | 'metro' | undefined) ?? 'city',
      customRequest: (defaultValues.customRequest as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: EventsConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="city"
        render={({ field, fieldState }) => {
          const value = typeof field.value === 'string'
            ? field.value
            : readCityLabel(field.value as StoredCity | undefined);
          return (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">City</Label>
              <Input
                value={value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder="e.g. San Francisco, Nashville, London"
              />
              {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
            </div>
          );
        }}
      />

      <Controller
        control={form.control}
        name="categories"
        render={({ field, fieldState }) => (
          <SpecificityTooltip
            fieldId="local_events.categories"
            disabled={disableHints}
            message="Specific interests get specific events. &lsquo;Live jazz, indie film, food pop-ups&rsquo; beats &lsquo;things to do.&rsquo;"
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">
                Categories <span className="font-normal text-ink-faint">(pick up to 5)</span>
              </Label>
              <PresetChipPicker
                presets={LOCAL_EVENTS_CATEGORY_PRESETS}
                value={(field.value as string[] | undefined) ?? []}
                onChange={field.onChange}
                max={5}
                customPlaceholder="Add a category…"
                normalize={(v) => v.trim().toLowerCase()}
              />
              {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
            </div>
          </SpecificityTooltip>
        )}
      />

      <Controller
        control={form.control}
        name="radius"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Radius</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'walking' as const, label: 'Walking', description: '1 mile' },
                { value: 'city' as const, label: 'City', description: 'City limits' },
                { value: 'metro' as const, label: 'Metro Area', description: '25 miles' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="customRequest"
        render={({ field }) => (
          <OptionalInput
            label="Anything specific? (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. Only free events, or anything related to jazz"
            maxLength={150}
          />
        )}
      />
    </form>
  );
}
