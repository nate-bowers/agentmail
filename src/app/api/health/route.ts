// Health endpoint. Pings critical dependencies (Supabase, Resend) and verifies
// the Anthropic API key is present. Each probe is wrapped in a 3s timeout so
// the endpoint never hangs even if a dep is unreachable.

import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const PROBE_TIMEOUT_MS = 3000;
const ANTHROPIC_KEY_MIN_LENGTH = 40; // sk-ant- keys are well over 40 chars

type CheckResult = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Wrap the thenable Supabase query builder into a real Promise so
    // Promise.race can type-check it.
    const queryPromise = Promise.resolve(
      adminClient.from('profiles').select('id').limit(1).maybeSingle(),
    );
    const { error } = await withTimeout(queryPromise, PROBE_TIMEOUT_MS, 'supabase');
    const latencyMs = Date.now() - start;
    if (error) return { ok: false, latencyMs, error: error.message };
    return { ok: true, latencyMs };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkResend(): Promise<CheckResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' };
  const start = Date.now();
  try {
    // Restricted send-only API keys can hit /domains successfully but not
    // /api-keys. /domains is a cheap GET that returns 200 for any valid key
    // (including send-only), making it a reliable liveness probe.
    const res = await withTimeout(
      fetch('https://api.resend.com/domains', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      }),
      PROBE_TIMEOUT_MS,
      'resend',
    );
    const latencyMs = Date.now() - start;
    // 200 = full key with read permissions. 401/403 = restricted send-only
    // key (our production setup) — still reachable, still able to send.
    // We accept both as "service responding" since the goal is liveness, not
    // permission enumeration. 4xx beyond auth or any 5xx = real problem.
    if (res.status === 200 || res.status === 401 || res.status === 403) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, error: `Unexpected Resend status ${res.status}` };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function checkAnthropicKey(): CheckResult {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };
  if (key.length < ANTHROPIC_KEY_MIN_LENGTH) {
    return { ok: false, error: 'ANTHROPIC_API_KEY shorter than expected' };
  }
  return { ok: true };
}

export async function GET() {
  const [supabase, resend] = await Promise.all([checkSupabase(), checkResend()]);
  const anthropic_key = checkAnthropicKey();

  const checks = { supabase, resend, anthropic_key };
  const allOk = supabase.ok && resend.ok && anthropic_key.ok;
  // Supabase is the authoritative critical dep — without it nothing works.
  const supabaseDown = !supabase.ok;

  const status: 'ok' | 'degraded' | 'down' = supabaseDown
    ? 'down'
    : allOk
      ? 'ok'
      : 'degraded';

  const httpStatus = status === 'down' ? 503 : 200;

  return NextResponse.json(
    { status, checks, timestamp: new Date().toISOString() },
    { status: httpStatus },
  );
}
