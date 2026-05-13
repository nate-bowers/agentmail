'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type WorkoutConfig } from '@/lib/modules/workout';
import { RadioCards, PillSelect, SegmentedControl, OptionalInput, OptionalTextarea } from './FormPrimitives';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function WorkoutForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<WorkoutConfig>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      fitnessLevel: (defaultValues.fitnessLevel as 'beginner' | 'intermediate' | 'advanced' | undefined) ?? 'intermediate',
      equipment: (defaultValues.equipment as 'none' | 'minimal' | 'full_gym' | undefined) ?? 'minimal',
      duration: (defaultValues.duration as 15 | 30 | 45 | undefined) ?? 30,
      focus: (defaultValues.focus as 'full_body' | 'upper' | 'lower' | 'cardio' | 'flexibility' | undefined) ?? 'full_body',
      injuries: (defaultValues.injuries as string | undefined) ?? '',
      customRequest: (defaultValues.customRequest as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: WorkoutConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="fitnessLevel"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Fitness level</Label>
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
        name="equipment"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Equipment</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'none' as const, label: 'None', emoji: '🧘', description: 'Bodyweight only' },
                { value: 'minimal' as const, label: 'Minimal', emoji: '🏠', description: 'Bands, dumbbells' },
                { value: 'full_gym' as const, label: 'Full Gym', emoji: '🏋️', description: 'All equipment' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="duration"
        render={({ field }) => (
          <SegmentedControl
            label="Duration"
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: 15 as const, label: '15 min' },
              { value: 30 as const, label: '30 min' },
              { value: 45 as const, label: '45 min' },
            ]}
          />
        )}
      />

      <Controller
        control={form.control}
        name="focus"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Focus</Label>
            <PillSelect
              value={field.value}
              onChange={(v) => field.onChange(v as typeof field.value)}
              options={[
                { value: 'full_body', label: 'Full Body' },
                { value: 'upper', label: 'Upper' },
                { value: 'lower', label: 'Lower' },
                { value: 'cardio', label: 'Cardio' },
                { value: 'flexibility', label: 'Flexibility' },
              ]}
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="injuries"
        render={({ field }) => (
          <OptionalInput
            label="Injuries or limitations (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. bad knees, lower back pain"
            maxLength={100}
          />
        )}
      />

      <Controller
        control={form.control}
        name="customRequest"
        render={({ field }) => (
          <OptionalTextarea
            label="Anything specific? (optional)"
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder="e.g. I have a race in 3 weeks, focus on leg endurance"
            maxLength={150}
          />
        )}
      />
    </form>
  );
}
