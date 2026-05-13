import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  teams: z.array(z.string().max(50)).max(5).default([]),
  leagues: z.array(z.string()).min(1, 'Add at least one league').max(3),
  customRequest: z.string().max(200).optional(),
});

export type SportsConfig = z.infer<typeof configSchema>;

export const sportsModule: ModuleDefinition<typeof configSchema> = {
  type: 'sports',
  label: 'Sports Scores',
  description: "Last night's scores and standings for your teams and leagues.",
  icon: 'Trophy',
  defaultConfig: {
    teams: [],
    leagues: ['NBA'],
  } satisfies SportsConfig,
  configSchema,
  buildSearchInstruction(config) {
    const teamsPart = config.teams.length > 0
      ? `the following teams: ${config.teams.join(', ')}.`
      : 'any notable teams in the selected leagues.';
    const leaguesPart = config.leagues.join(', ');
    let instruction =
      `Search for the most recent scores and results for ${teamsPart} ` +
      `Also include a brief standings update for these leagues: ${leaguesPart}. ` +
      `If a team played last night, include the final score and opponent. ` +
      `If no game last night, note their next scheduled game.`;
    if (config.customRequest) {
      instruction += ` Additional request from the user: ${config.customRequest}`;
    }
    return instruction;
  },
};
