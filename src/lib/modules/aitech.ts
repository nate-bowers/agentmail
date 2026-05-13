import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  subtopics: z.array(z.string()).min(1, 'Select at least one subtopic').max(4),
  depth: z.enum(['headlines', 'analysis']).default('headlines'),
  customFocus: z.string().max(150).optional(),
});

export type AiTechConfig = z.infer<typeof configSchema>;

export const aitechModule: ModuleDefinition<typeof configSchema> = {
  type: 'ai_tech',
  label: 'AI & Tech Briefing',
  description: 'Daily developments in AI, startups, and the tech industry.',
  icon: 'Cpu',
  defaultConfig: {
    subtopics: ['AI models', 'startups'],
    depth: 'headlines',
  } satisfies AiTechConfig,
  configSchema,
  buildSearchInstruction(config) {
    const subtopicStr = config.subtopics.join(', ');
    const depthDetail =
      config.depth === 'headlines'
        ? 'headlines = title + one sentence each'
        : 'analysis = title + 3-sentence breakdown of why it matters and what it signals';
    let instruction =
      `Search for the most important AI and technology news from the last 24 hours. ` +
      `Focus on these subtopics: ${subtopicStr}. ` +
      `Depth: ${config.depth} (${depthDetail}).`;
    if (config.customFocus) {
      instruction += ` Pay special attention to: ${config.customFocus}.`;
    }
    instruction +=
      ` Return 4-5 stories. Prioritize original reporting over aggregators. ` +
      `Include the source name for each story. ` +
      `This reader is technically sophisticated — do not over-explain basic concepts ` +
      `but do explain the significance of each development.`;
    return instruction;
  },
};
