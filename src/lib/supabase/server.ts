// Server client — use in Server Components, Route Handlers, and Server Actions.
// Reads and writes the session cookie via next/headers so the user's auth state
// is available during SSR. Must only be called in a server context.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component where cookies are read-only.
            // Safe to ignore — the middleware will refresh the session instead.
          }
        },
      },
    }
  );
}
