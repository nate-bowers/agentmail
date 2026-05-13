import type { ModuleDefinition, ModuleRow, ModuleSearchInstruction } from '@/types';
import { sanitizeConfig } from '@/lib/security/sanitize';
import { weatherModule } from './weather';
import { newsModule } from './news';
import { quoteModule } from './quote';
import { marketsModule } from './markets';

// ─────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MODULE_REGISTRY: Record<string, ModuleDefinition<any>> = {
  [weatherModule.type]: weatherModule,
  [newsModule.type]: newsModule,
  [quoteModule.type]: quoteModule,
  [marketsModule.type]: marketsModule,
};

// ─────────────────────────────────────────────────────────────
// buildSearchInstructions
// ─────────────────────────────────────────────────────────────

/**
 * Converts an array of enabled user module rows into search instructions
 * ready to be passed to the Claude generation step.
 *
 * Rows with unknown or unrecognised module_type values are silently skipped
 * so that adding a new module type doesn't break existing users mid-deploy.
 *
 * Config is validated against the module's Zod schema before the instruction
 * is built. Rows with invalid config are skipped and logged to stderr so the
 * email still sends for the remaining valid modules.
 */
export function buildSearchInstructions(
  modules: ModuleRow[]
): ModuleSearchInstruction[] {
  const instructions: ModuleSearchInstruction[] = [];

  for (const row of modules) {
    const definition = MODULE_REGISTRY[row.module_type];

    if (!definition) {
      console.warn(`[modules] Unknown module_type "${row.module_type}" — skipping.`);
      continue;
    }

    const parsed = definition.configSchema.safeParse(row.config);

    if (!parsed.success) {
      console.error(
        `[modules] Invalid config for module ${row.id} (${row.module_type}):`,
        parsed.error.flatten()
      );
      continue;
    }

    const sanitizedConfig = sanitizeConfig(parsed.data as Record<string, unknown>);

    instructions.push({
      moduleType: row.module_type,
      config: sanitizedConfig,
      searchInstruction: definition.buildSearchInstruction(sanitizedConfig),
    });
  }

  return instructions;
}
