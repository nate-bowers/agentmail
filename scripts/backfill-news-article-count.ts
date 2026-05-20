/* eslint-disable no-console */
// One-time backfill: every modules row where module_type='news' has its
// config.articleCount field normalized to 3. The news module was simplified to
// always return exactly 3 articles; this clears out the legacy `5` and `10`
// values so the Zod `articleCount` field can be removed from the schema in a
// follow-up commit.
//
// Usage:
//   node --env-file=.env.local --experimental-strip-types scripts/backfill-news-article-count.ts            # dry run
//   node --env-file=.env.local --experimental-strip-types scripts/backfill-news-article-count.ts --apply    # writes
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { createClient } from '@supabase/supabase-js';

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
    .eq('module_type', 'news');

  if (error) {
    console.error('[backfill] failed to fetch modules:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as ModuleRow[];
  console.log(`[backfill] found ${rows.length} news module row(s)`);

  let alreadyThree = 0;
  let missing = 0;
  let needsUpdate = 0;
  let updated = 0;
  const oldValueCounts: Record<string, number> = {};

  for (const row of rows) {
    const raw = row.config?.articleCount as unknown;

    if (raw === undefined || raw === null) {
      missing++;
      continue;
    }

    if (raw === 3) {
      alreadyThree++;
      continue;
    }

    const key = String(raw);
    oldValueCounts[key] = (oldValueCounts[key] ?? 0) + 1;
    needsUpdate++;
    console.log(`[backfill] row ${row.id} (user ${row.user_id}): articleCount=${key} → 3`);

    if (apply) {
      const newConfig = { ...row.config, articleCount: 3 };
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
  console.log(`  total rows:        ${rows.length}`);
  console.log(`  already =3:        ${alreadyThree}`);
  console.log(`  missing field:     ${missing}`);
  console.log(`  needs update:      ${needsUpdate}`);
  if (needsUpdate > 0) {
    console.log('  old-value breakdown:');
    for (const [val, count] of Object.entries(oldValueCounts)) {
      console.log(`    ${val}: ${count}`);
    }
  }
  if (apply) console.log(`  wrote:             ${updated}`);
  else console.log('  (dry run, no writes)');
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('[backfill] crashed:', err);
    process.exit(1);
  }
);
