/* eslint-disable no-console */
// One-time backfill: every modules row where module_type='local_events' has
// its config.city normalized via Open-Meteo. Rows that already carry a
// geocoded object are left untouched. Rows that can't be geocoded are left
// untouched and flagged so the user re-enters from the dashboard.
//
// Usage:
//   node --env-file=.env.local --experimental-strip-types scripts/backfill-events-geocode.ts           # dry run
//   node --env-file=.env.local --experimental-strip-types scripts/backfill-events-geocode.ts --apply   # writes

import { createClient } from '@supabase/supabase-js';
import { normalizeSingleLocation } from '../src/lib/modules/weatherGeocode.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const apply = process.argv.includes('--apply');
const dryRun = !apply;

interface ModuleRow {
  id: string;
  user_id: string;
  config: Record<string, unknown>;
}

async function main() {
  console.log(`[backfill] mode: ${dryRun ? 'DRY RUN (no writes)' : 'APPLY (will write)'}`);

  const { data, error } = await supabase
    .from('modules')
    .select('id, user_id, config')
    .eq('module_type', 'local_events');

  if (error) {
    console.error('[backfill] failed to fetch modules:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as ModuleRow[];
  console.log(`[backfill] found ${rows.length} local_events module row(s)`);

  let skipped = 0;
  let resolved = 0;
  let updated = 0;
  const failures: { id: string; user_id: string; failedInput: string }[] = [];

  for (const row of rows) {
    const city = row.config?.city as unknown;
    if (city && typeof city === 'object' && typeof (city as { latitude?: unknown }).latitude === 'number') {
      skipped++;
      continue;
    }

    const result = await normalizeSingleLocation(city);
    if (!result.ok) {
      console.warn(
        `[backfill] row ${row.id} (user ${row.user_id}): failed at input "${result.failedInput}" (${result.reason})`
      );
      failures.push({ id: row.id, user_id: row.user_id, failedInput: result.failedInput });
      continue;
    }

    resolved++;
    console.log(`[backfill] row ${row.id}: resolved → ${result.location.display_name}`);

    if (apply) {
      const newConfig = { ...row.config, city: result.location };
      const { error: updErr } = await supabase
        .from('modules')
        .update({ config: newConfig })
        .eq('id', row.id);
      if (updErr) console.error(`[backfill] update failed for ${row.id}:`, updErr.message);
      else updated++;
    }
  }

  console.log('\n[backfill] summary');
  console.log(`  total rows:    ${rows.length}`);
  console.log(`  already done:  ${skipped}`);
  console.log(`  resolvable:    ${resolved}`);
  console.log(`  failed:        ${failures.length}`);
  if (apply) console.log(`  wrote:         ${updated}`);
  else console.log('  (dry run, no writes)');

  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  ${f.id}  user=${f.user_id}  input="${f.failedInput}"`);
    }
    console.log("\nThese users will see the dashboard re-entry notice until they re-save the city.");
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('[backfill] crashed:', err);
    process.exit(1);
  }
);
