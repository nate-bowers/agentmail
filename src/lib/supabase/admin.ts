// Admin (service role) client — use ONLY in trusted server contexts:
// scheduled email sending, webhook handlers, and writing email_logs.
// This client bypasses Row Level Security entirely. Never expose it to
// the browser or import it from Client Components.

import { createClient } from '@supabase/supabase-js';

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
