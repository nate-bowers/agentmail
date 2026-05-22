// Distributed rate limiter backed by Supabase.
//
// The previous implementation was a per-instance in-memory Map, which on
// serverless meant essentially no limit (a fresh cold-start reset the
// counter). This implementation hits a single Postgres row per key via an
// atomic SECURITY DEFINER function, so every Vercel instance sees the
// same counter.
//
// API stayed almost identical to the old helper. The only breaking change
// is that rateLimit() is now async — every caller needs `await`.
//
// On any DB error we *fail open* (return allowed=true). The rationale:
// rate-limit infrastructure failing is annoying, but blocking every
// authenticated user from checkout/forgot-password/etc because of a
// transient Supabase blip is worse. The DB error is logged.

import { adminClient } from '@/lib/supabase/admin';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RpcPayload {
  allowed: boolean;
  count: number;
  remaining: number;
  reset_at_ms: number;
}

export async function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await adminClient.rpc('check_rate_limit', {
      p_key: identifier,
      p_max: maxRequests,
      p_window_ms: windowMs,
    });
    if (error) {
      console.error('[rateLimit] DB error, failing open:', error.message);
      return failOpen(maxRequests, windowMs);
    }
    const payload = data as RpcPayload;
    return {
      allowed: payload.allowed,
      remaining: payload.remaining,
      resetAt: payload.reset_at_ms,
    };
  } catch (err) {
    console.error('[rateLimit] unexpected error, failing open:', err);
    return failOpen(maxRequests, windowMs);
  }
}

function failOpen(maxRequests: number, windowMs: number): RateLimitResult {
  return {
    allowed: true,
    remaining: maxRequests - 1,
    resetAt: Date.now() + windowMs,
  };
}
