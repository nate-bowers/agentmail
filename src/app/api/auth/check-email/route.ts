// Pre-signup email validator. Called by AuthForm before Supabase signUp so
// that disposable-email accounts are rejected before any auth record exists.
// Server-side logging captures the domain (never the full address) so we can
// see if the blocklist is being probed.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isDisposableEmail,
  extractDomain,
  DISPOSABLE_REJECTION_MESSAGE,
} from '@/lib/security/disposableEmail';

const bodySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  if (isDisposableEmail(parsed.data.email)) {
    const domain = extractDomain(parsed.data.email);
    console.warn('[check-email] rejected disposable domain:', domain);
    return NextResponse.json(
      { error: 'disposable_email', message: DISPOSABLE_REJECTION_MESSAGE },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true });
}
