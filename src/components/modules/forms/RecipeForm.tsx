'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type RecipeConfig } from '@/lib/modules/recipe';
import { SegmentedControl, RadioCards, OptionalTextarea } from './FormPrimitives';
import { SpecificityTooltip } from '@/components/modules/SpecificityTooltip';
import { PresetChipPicker } from '@/components/modules/PresetChipPicker';
import { RECIPE_CUISINE_PRESETS, DIETARY_PRESETS } from '@/lib/modules/presets';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  disableHints?: boolean;
}

export function RecipeForm({ defaultValues, onSubmit, disableHints }: Props) {
  const form = useForm<RecipeConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      cuisine: (defaultValues.cuisine as string | undefined) ?? 'any',
      dietary: (defaultValues.dietary as string[] | undefined) ?? [],
      maxCookTime: (defaultValues.maxCookTime as 15 | 30 | 45 | 60 | null | undefined) ?? 30,
      skillLevel: (defaultValues.skillLevel as 'beginner' | 'intermediate' | 'advanced' | undefined) ?? 'beginner',
      customRequest: (defaultValues.customRequest as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: RecipeConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="cuisine"
        render={({ field }) => (
          <SpecificityTooltip
            fieldId="recipe.cuisine"
            disabled={disableHints}
            message="Pick one — or type your own. &lsquo;Sichuan&rsquo; works just as well as &lsquo;Chinese.&rsquo;"
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">Cuisine</Label>
              {/* Single-select chip picker. The DB column stores a single
                  string; PresetChipPicker enforces single-select via the
                  singleSelect prop, and Other still works. */}
              <PresetChipPicker
                presets={RECIPE_CUISINE_PRESETS}
                value={field.value ? [field.value as string] : ['any']}
                onChange={(next) => field.onChange(next[0] ?? 'any')}
                singleSelect
                customPlaceholder="Add another cuisine…"
                normalize={(v) => v.trim().toLowerCase()}
              />
            </div>
          </SpecificityTooltip>
        )}
      />

      <Controller
        control={form.control}
        name="dietary"
        render={({ field }) => (
          <SpecificityTooltip
            fieldId="recipe.dietary"
            disabled={disableHints}
            message="Stack as many as apply. Real restrictions (&lsquo;gluten-free, low-sodium, high-protein&rsquo;) work better than a single label."
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">
                Dietary restrictions <span className="font-normal text-ink-faint">(optional, max 5)</span>
              </Label>
              <PresetChipPicker
                presets={DIETARY_PRESETS}
                value={(field.value as string[] | undefined) ?? []}
                onChange={field.onChange}
                max={5}
                customPlaceholder="Add another restriction…"
                normalize={(v) => v.trim().toLowerCase()}
              />
            </div>
          </SpecificityTooltip>
        )}
      />

      <Controller
        control={form.control}
        name="maxCookTime"
        render={({ field }) => (
          <SegmentedControl
            label="Max cook time"
            value={field.value === null ? 'none' : String(field.value)}
            onChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
            options={[
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
              { value: '45', label: '45 min' },
              { value: '60', label: '1 hour' },
              { value: 'none', label: 'No limit' },
            ]}
          />
        )}
      />

      <Controller
        control={form.control}
        name="skillLevel"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Skill level</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'beginner' as const, label: 'Beginner', description: 'Simple ingredients and steps' },
                { value: 'intermediate' as const, label: 'Intermediate', description: 'Some technique required' },
                { value: 'advanced' as const, label: 'Advanced', description: 'Complex methods, specialty ingredients' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="customRequest"
        render={({ field }) => (
          <SpecificityTooltip
            fieldId="recipe.customRequest"
            disabled={disableHints}
            message="The more specific you are, the better the brief. Mention pantry items, allergies, or the meal occasion."
          >
            <OptionalTextarea
              label="Anything specific? (optional)"
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="e.g. Something I can meal prep on Sunday, or a dish that uses chicken thighs and lemon"
              maxLength={200}
            />
          </SpecificityTooltip>
        )}
      />
    </form>
  );
}
