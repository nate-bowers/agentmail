import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  genres: z.array(z.string().max(40, 'Genre name is too long')).max(5, 'Maximum 5 genres').default([]),
  format: z.enum(['fiction', 'nonfiction', 'either']).default('either'),
  length: z.enum(['short', 'medium', 'long', 'any']).default('any'),
  mood: z.string().max(80).default('inspiring'),
  avoidTopics: z.string().max(100).optional(),
  customRequest: z.string().max(150).optional(),
});

export type BookConfig = z.infer<typeof configSchema>;

export const bookModule: ModuleDefinition<typeof configSchema> = {
  type: 'book',
  label: 'Book Recommendation',
  description: 'A book recommendation matched to your reading taste.',
  icon: 'BookMarked',
  defaultConfig: {
    genres: [],
    format: 'either',
    length: 'any',
    mood: 'inspiring',
  } satisfies BookConfig,
  configSchema,
  buildSearchInstruction(config) {
    const genreStr = config.genres && config.genres.length > 0 ? config.genres.join(', ') : 'open to anything';
    let instruction =
      `Recommend a book for someone with the following preferences: ` +
      `Genres: ${genreStr}. Format: ${config.format}. ` +
      `Length preference: ${config.length} (short = under 200 pages, medium = 200-350, long = over 350). ` +
      `Mood: ${config.mood}.`;
    if (config.avoidTopics) {
      instruction += ` Avoid books about: ${config.avoidTopics}.`;
    }
    if (config.customRequest) {
      instruction += ` Specific request: ${config.customRequest}.`;
    }
    instruction +=
      ` Search for a well-regarded book (not necessarily recent) that fits well. ` +
      `Return: title, author, year published, page count, genre, a 3-sentence summary that explains the premise ` +
      `and why it is worth reading, and one sentence on who this book is perfect for. ` +
      `Do not recommend the same book twice in a month.`;
    return instruction;
  },
};
