// Browser Sentry SDK init.
// Loaded automatically by @sentry/nextjs on the client.
// No-ops gracefully when NEXT_PUBLIC_SENTRY_DSN is not set (local dev / preview).

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? 'development',
  });
}
