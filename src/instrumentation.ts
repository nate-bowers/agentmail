// Runs once at server startup (not per-request).
// Used to validate required environment variables before the server
// accepts any traffic — fails fast instead of crashing inside a route.
// Also boots Sentry for the active runtime (Node or Edge). Sentry init
// itself is gated on NEXT_PUBLIC_SENTRY_DSN inside the config files, so
// unset DSNs no-op safely.

export async function register() {
  // Only run env validation in the Node.js runtime, not in Edge or during
  // static generation.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env');
    validateEnv();

    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
