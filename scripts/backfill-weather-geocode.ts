/* eslint-disable no-console */
// One-time backfill: reads every modules row where module_type='weather' and
// has at least one un-geocoded location entry, geocodes each via Open-Meteo,
// and updates the row in-place. Existing geocoded entries pass through
// unchanged. Rows where any location fails to resolve are left untouched and
// flagged so the user can re-enter from the dashboard.
//
// Usage (Node 20.6+ has native --env-file, no dotenv dep needed):
//   node --env-file=.env.local --experimental-strip-types scripts/backfill-weather-geocode.ts            # dry run
//   node --env-file=.env.local --experimental-strip-types scripts/backfill-weather-geocode.ts --apply    # writes
//
// or via tsx if installed:
//   tsx --env-file=.env.local scripts/backfill-weather-geocode.ts [--apply]
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { createClient } from '@supabase/supabase-js';
import { normalizeWeatherLocations } from '../src/lib/modules/weatherGeocode.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
    .eq('module_type', 'weather');

  if (error) {
    console.error('[backfill] failed to fetch modules:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as ModuleRow[];
  console.log(`[backfill] found ${rows.length} weather module row(s)`);

  let skipped = 0;
  let resolved = 0;
  let updated = 0;
  const failures: { id: string; user_id: string; failedInput: string }[] = [];

  for (const row of rows) {
    const locs = row.config?.locations as unknown;
    if (!Array.isArray(locs) || locs.length === 0) {
      skipped++;
      continue;
    }
    // Skip if already fully geocoded.
    const allGeocoded = locs.every(
      (l) => l && typeof l === 'object' && typeof (l as { latitude?: unknown }).latitude === 'number'
    );
    if (allGeocoded) {
      skipped++;
      continue;
    }

    const result = await normalizeWeatherLocations(locs);
    if (!result.ok) {
      console.warn(
        `[backfill] row ${row.id} (user ${row.user_id}): failed at input "${result.failedInput}" (${result.reason})`
      );
      failures.push({ id: row.id, user_id: row.user_id, failedInput: result.failedInput });
      continue;
    }

    resolved++;
    const labels = result.locations.map((l) => l.display_name).join(' | ');
    console.log(`[backfill] row ${row.id}: resolved ${result.locations.length} location(s) → ${labels}`);

    if (apply) {
      const newConfig = { ...row.config, locations: result.locations };
      const { error: updErr } = await supabase
        .from('modules')
        .update({ config: newConfig })
        .eq('id', row.id);
      if (updErr) {
        console.error(`[backfill] update failed for ${row.id}:`, updErr.message);
      } else {
        updated++;
      }
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
    console.log("\nThese users will see the dashboard re-entry notice and the in-email error fallback");
    console.log("until they re-save the weather module with a more specific location.");
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('[backfill] crashed:', err);
    process.exit(1);
  }
);
