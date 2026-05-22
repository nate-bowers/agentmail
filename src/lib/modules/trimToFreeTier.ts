// Disable modules until the user fits within the free-tier credit budget.
//
// Called when a user transitions Pro → Free (Stripe cancel, past_due,
// unpaid, etc.) so their dashboard and their morning brief match the
// plan they're actually on. Modules are disabled (`is_enabled = false`)
// rather than deleted — so if they re-upgrade, their configured modules
// come back without re-configuration.
//
// Strategy: walk the user's currently-enabled modules in display_order
// (their own prioritization), keep each one while it fits the budget,
// disable the rest. A 2-credit module that overflows is skipped but a
// later 1-credit module that still fits is kept.

import { adminClient } from '@/lib/supabase/admin';
import { MODULE_POINTS, FREE_TIER_POINTS } from './points';

export interface TrimResult {
  /** How many modules were disabled by this trim. */
  disabled: number;
  /** How many modules remain enabled after the trim. */
  kept: number;
  /** Credits used by the modules that remain enabled. */
  creditsUsed: number;
}

export async function trimModulesToFreeTier(userId: string): Promise<TrimResult> {
  const { data: modules, error } = await adminClient
    .from('modules')
    .select('id, module_type, display_order')
    .eq('user_id', userId)
    .eq('is_enabled', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error(`[trimToFreeTier] failed to fetch modules for ${userId}: ${error.message}`);
    return { disabled: 0, kept: 0, creditsUsed: 0 };
  }
  if (!modules?.length) return { disabled: 0, kept: 0, creditsUsed: 0 };

  let budget = FREE_TIER_POINTS;
  const toDisable: string[] = [];
  let kept = 0;

  for (const m of modules) {
    const cost = MODULE_POINTS[m.module_type] ?? 1;
    if (cost <= budget) {
      budget -= cost;
      kept++;
    } else {
      toDisable.push(m.id);
    }
  }

  if (toDisable.length > 0) {
    const { error: updateError } = await adminClient
      .from('modules')
      .update({ is_enabled: false })
      .in('id', toDisable);
    if (updateError) {
      console.error(`[trimToFreeTier] failed to disable modules for ${userId}: ${updateError.message}`);
      return { disabled: 0, kept, creditsUsed: FREE_TIER_POINTS - budget };
    }
    console.log(
      `[trimToFreeTier] user=${userId} disabled=${toDisable.length} kept=${kept} creditsUsed=${FREE_TIER_POINTS - budget}`,
    );
  }

  return { disabled: toDisable.length, kept, creditsUsed: FREE_TIER_POINTS - budget };
}
