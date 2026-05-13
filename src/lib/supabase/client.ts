// Browser client — use in Client Components ('use client') and browser-side code.
// Creates a singleton tied to the user's session cookie managed by @supabase/ssr.
// Do NOT use this on the server; it has no access to server-side cookies.

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
