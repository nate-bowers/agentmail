// Validated, typed access to environment variables.
// Import { env } from '@/lib/config/env' in server-only code instead of
// accessing process.env directly — this gives you type safety and a single
// source of truth for all env var names.
//
// This module is server-only. It will throw at module-load time if any
// required variable is missing, so misconfiguration surfaces immediately.

import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI
  ANTHROPIC_API_KEY: z.string().min(1),

  // Email
  RESEND_API_KEY: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),

  // Site
  NEXT_PUBLIC_SITE_URL: z.string().url(),

  // Internal secrets
  CRON_SECRET: z.string().min(32),
  UNSUBSCRIBE_SECRET: z.string().min(32),
});

type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      [
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '  Environment variable validation failed:',
        issues,
        '',
        '  Copy .env.example to .env.local and fill in',
        '  all required values before starting the server.',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
      ].join('\n')
    );
  }
  return result.data;
}

export const env: Env = parseEnv();
