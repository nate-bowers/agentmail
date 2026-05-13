import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  cuisine: z.string().default('any'),
  dietary: z.array(z.string()).default([]),
  maxCookTime: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60), z.null()]).default(30),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  customRequest: z.string().max(200).optional(),
});

export type RecipeConfig = z.infer<typeof configSchema>;

export const recipeModule: ModuleDefinition<typeof configSchema> = {
  type: 'recipe',
  label: 'Recipe of the Day',
  description: 'A daily recipe matched to your diet and time constraints.',
  icon: 'ChefHat',
  defaultConfig: {
    cuisine: 'any',
    dietary: [],
    maxCookTime: 30,
    skillLevel: 'beginner',
  } satisfies RecipeConfig,
  configSchema,
  buildSearchInstruction(config) {
    const cuisineStr = config.cuisine && config.cuisine !== 'any' ? config.cuisine : 'any cuisine';
    const dietaryStr = config.dietary && config.dietary.length > 0 ? config.dietary.join(', ') : 'none';
    const timeStr = config.maxCookTime !== null ? `${config.maxCookTime} minutes` : 'no time limit';
    let instruction =
      `Generate a recipe of the day for someone with the following preferences: ` +
      `Cuisine: ${cuisineStr}. Dietary restrictions: ${dietaryStr}. ` +
      `Max cook time: ${timeStr}. Skill level: ${config.skillLevel}.`;
    if (config.customRequest) {
      instruction += ` Additional request: ${config.customRequest}.`;
    }
    instruction +=
      ` Return: recipe name, a one-line description of the dish, prep time, cook time, serving size, ` +
      `ingredients as a list with measurements, and numbered steps. Keep steps clear and beginner-friendly ` +
      `if skill level is beginner. Do not suggest overly obscure ingredients.`;
    return instruction;
  },
};
