// Generic signed tokens with embedded timestamp.
//
// Format: base64url(userId).base64url(timestamp).base64url(signature)
//   - userId: the Supabase user UUID
//   - timestamp: ISO-8601 string of when the token was issued
//   - signature: HMAC-SHA256 over "userId:timestamp"
//
// Server-only — never import from client components.

import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET env var is not set');
  return secret;
}

function sign(userId: string, timestamp: string): string {
  return createHmac('sha256', getSecret())
    .update(`${userId}:${timestamp}`)
    .digest('hex');
}

export function generateToken(userId: string): string {
  const timestamp = new Date().toISOString();
  const signature = sign(userId, timestamp);
  return [
    Buffer.from(userId).toString('base64url'),
    Buffer.from(timestamp).toString('base64url'),
    Buffer.from(signature).toString('base64url'),
  ].join('.');
}

export interface VerifiedToken {
  userId: string;
  issuedAt: Date;
}

/**
 * Returns the verified payload if the token is valid, null otherwise.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyToken(token: string): VerifiedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [userIdB64, timestampB64, signatureB64] = parts;

    const userId = Buffer.from(userIdB64, 'base64url').toString('utf8');
    const timestamp = Buffer.from(timestampB64, 'base64url').toString('utf8');
    const provided = Buffer.from(signatureB64, 'base64url').toString('utf8');

    if (!userId || !timestamp) return null;

    const expected = sign(userId, timestamp);

    const a = Buffer.from(provided, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;

    const issuedAt = new Date(timestamp);
    if (isNaN(issuedAt.getTime())) return null;

    return { userId, issuedAt };
  } catch {
    return null;
  }
}
