// Edge Sentry SDK init (middleware + edge runtime routes).
// Loaded by src/instrumentation.ts via the official register() hook.
// No-ops gracefully when NEXT_PUBLIC_SENTRY_DSN is not set.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? 'development',
  });
}
