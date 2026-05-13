import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  equipment: z.enum(['none', 'minimal', 'full_gym']),
  duration: z.union([z.literal(15), z.literal(30), z.literal(45)]),
  focus: z.enum(['full_body', 'upper', 'lower', 'cardio', 'flexibility']),
  injuries: z.string().max(100).optional(),
  customRequest: z.string().max(150).optional(),
});

export type WorkoutConfig = z.infer<typeof configSchema>;

const equipmentLabel: Record<string, string> = {
  none: 'no equipment (bodyweight only)',
  minimal: 'minimal equipment (bands and dumbbells)',
  full_gym: 'full gym access',
};

const focusLabel: Record<string, string> = {
  full_body: 'full body',
  upper: 'upper body',
  lower: 'lower body',
  cardio: 'cardio',
  flexibility: 'flexibility and mobility',
};

export const workoutModule: ModuleDefinition<typeof configSchema> = {
  type: 'workout',
  label: 'Daily Workout',
  description: 'A quick workout tailored to your fitness level and available equipment.',
  icon: 'Dumbbell',
  defaultConfig: {
    fitnessLevel: 'intermediate',
    equipment: 'minimal',
    duration: 30,
    focus: 'full_body',
  } satisfies WorkoutConfig,
  configSchema,
  buildSearchInstruction(config) {
    let instruction =
      `Generate a ${config.duration}-minute ${focusLabel[config.focus]} workout for a ` +
      `${config.fitnessLevel} person with ${equipmentLabel[config.equipment]}. Include: ` +
      `a 2-sentence intro motivating the workout, a warm-up (2-3 exercises), main circuit ` +
      `(4-6 exercises with sets and reps or duration), and a cool-down note. Format as a ` +
      `clean structured list. Make it specific and actionable, not generic.`;
    if (config.injuries) {
      instruction += ` Avoid exercises that stress: ${config.injuries}.`;
    }
    if (config.customRequest) {
      instruction += ` Additional context: ${config.customRequest}`;
    }
    return instruction;
  },
};
