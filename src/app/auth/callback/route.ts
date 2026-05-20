import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email/sendWelcome';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    // Build the redirect response first so we can attach cookies directly to it.
    // Using createClient() here loses the session because cookieStore.set() writes
    // to the default response, not to the NextResponse.redirect() we return.
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Fire-and-forget welcome email. Idempotent via welcome_email_sent
      // flag, so re-entering this callback (e.g. after a stale code retry)
      // does not double-send. We await briefly to surface obvious errors
      // in the function log, but a slow Resend call should not block the
      // redirect for OAuth users.
      if (data.user?.id) {
        sendWelcomeEmail(data.user.id).catch((err) => {
          console.error('[auth/callback] sendWelcomeEmail failed:', err);
        });
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
