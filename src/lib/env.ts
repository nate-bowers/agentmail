// Server-side environment variable validation.
// Called once at server startup via src/instrumentation.ts.
// Fails fast with a clear error rather than cryptic runtime crashes later.

const SERVER_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRO_PRICE_ID',
  'CRON_SECRET',
  'UNSUBSCRIBE_SECRET',
] as const;

const PUBLIC_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
] as const;

export function validateEnv(): void {
  const missing = [...SERVER_VARS, ...PUBLIC_VARS].filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      [
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '  Missing required environment variables:',
        ...missing.map((k) => `    • ${k}`),
        '',
        '  Copy .env.example to .env.local and fill in',
        '  all required values before starting the server.',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
      ].join('\n')
    );
  }
}
