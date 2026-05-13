// Signed, non-expiring unsubscribe tokens.
//
// Format (before base64url encoding): "<userId>:<HMAC-SHA256>"
// The token is deterministic for a given user — the same token always
// works for the same user, which is correct for unsubscribe links.
//
// Server-only — never import from client components.

import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET env var is not set');
  return secret;
}

function sign(userId: string): string {
  return createHmac('sha256', getSecret()).update(userId).digest('hex');
}

export function generateUnsubscribeToken(userId: string): string {
  const payload = `${userId}:${sign(userId)}`;
  return Buffer.from(payload).toString('base64url');
}

/**
 * Returns the userId if the token is valid, null otherwise.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const colonIdx = decoded.indexOf(':');
    if (colonIdx === -1) return null;

    const userId = decoded.slice(0, colonIdx);
    const provided = decoded.slice(colonIdx + 1);
    const expected = sign(userId);

    // timingSafeEqual requires same-length buffers
    const a = Buffer.from(provided, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;

    return timingSafeEqual(a, b) ? userId : null;
  } catch {
    return null;
  }
}
