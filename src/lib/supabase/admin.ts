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

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export function createAdminClient() {
  const { url, key } = getAdminKeys();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
