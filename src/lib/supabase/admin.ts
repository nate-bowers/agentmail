// Admin (service role) client — use ONLY in trusted server contexts:
// scheduled email sending, webhook handlers, and writing email_logs.
// This client bypasses Row Level Security entirely. Never expose it to
// the browser or import it from Client Components.

import { createClient } from '@supabase/supabase-js';

function getAdminKeys() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return { url, key };
}

export function createAdminClient() {
  const { url, key } = getAdminKeys();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Lazy singleton — defers instantiation to first use so the module can be
// imported without NEXT_PUBLIC_SUPABASE_URL being available at build time.
let _adminClient: ReturnType<typeof createAdminClient> | null = null;
export const adminClient = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(_, prop: string | symbol) {
    if (!_adminClient) _adminClient = createAdminClient();
    return (_adminClient as unknown as Record<string | symbol, unknown>)[prop];
  },
});
