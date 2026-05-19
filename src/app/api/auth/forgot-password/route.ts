import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/rateLimit';

// Forgot-password initiator. Always returns the same generic 200 message
// regardless of whether the email is registered — prevents account enumeration.

const bodySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const GENERIC_RESPONSE = {
  ok: true,
  message: "If an account exists for that email, we've sent a reset link.",
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    // Schema-level errors are surfaced (malformed email is fine to call out).
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Per-email cap: 3 reset attempts per hour. Protects against spam and abuse.
  const emailLimit = rateLimit(`forgot-password:email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) {
    // Stay generic even on rate-limit (don't tell the caller their email is being targeted).
    return NextResponse.json(GENERIC_RESPONSE);
  }

  // Per-IP cap: 10 attempts per hour. Defense against scripted enumeration.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  const ipLimit = rateLimit(`forgot-password:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  // Fire the Supabase reset flow. Errors here are NOT surfaced — we want the
  // response to look identical whether the email is registered, unregistered,
  // or the call failed.
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dailybriefmail.com';
    await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
  } catch (err) {
    console.error('[forgot-password] Supabase resetPasswordForEmail failed (silent to client):', err);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
