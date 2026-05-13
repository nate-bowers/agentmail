// Runs once at server startup (not per-request).
// Used to validate required environment variables before the server
// accepts any traffic — fails fast instead of crashing inside a route.

export async function register() {
  // Only run in the Node.js runtime, not in Edge or during static generation
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env');
    validateEnv();
  }
}
