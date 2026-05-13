// Validate required environment variables at build time.
// This surfaces misconfiguration early instead of at runtime.
// Skip during `next lint` or other tooling that sets CI=true without real env vars.
if (process.env.SKIP_ENV_VALIDATION !== '1' && process.env.NODE_ENV !== 'test') {
  const { validateEnv } = await import('./src/lib/env.js');
  try {
    validateEnv();
  } catch (err) {
    // In CI without secrets (e.g. build previews), just warn instead of failing.
    // The server-side check in instrumentation.ts still catches real misconfigurations.
    if (process.env.CI) {
      console.warn('[env]', err.message);
    } else {
      throw err;
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enables src/instrumentation.ts for startup env validation
    instrumentationHook: true,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
