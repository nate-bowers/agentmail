import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

// /api/unsubscribe supports three callers:
//
// 1. Gmail one-click (RFC 8058)
//    POST /api/unsubscribe?token=<token>
//    Content-Type: application/x-www-form-urlencoded
//    Body: "List-Unsubscribe=One-Click"
//    Returns 200 OK with plain text.
//
// 2. Our own confirmation page (src/app/unsubscribe/UnsubscribeConfirm.tsx)
//    POST /api/unsubscribe
//    Content-Type: application/json
//    Body: { "token": "<token>", "action"?: "unsubscribe" | "resubscribe" }
//    Returns JSON.
//
// 3. Plain mailto fallback handled out-of-band: Cloudflare Email Routing
//    forwards unsubscribe@dailybriefmail.com to the founder. Not implemented here.

type Action = 'unsubscribe' | 'resubscribe' | 'delete';

async function applyAction(userId: string, action: Action) {
  if (action === 'delete') {
    // Hard-delete the auth user. The `profiles` row cascades via FK, taking
    // modules, email_logs, etc. with it. Use admin client only.
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    return error;
  }
  const isActive = action === 'resubscribe';
  const { error } = await adminClient
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId);
  return error;
}

async function readToken(request: NextRequest): Promise<{ token: string | null; action: Action }> {
  // URL query token is preferred (Gmail one-click uses this).
  const urlToken = request.nextUrl.searchParams.get('token');

  const contentType = request.headers.get('content-type') ?? '';

  // Form-encoded body (Gmail one-click). Action is always "unsubscribe".
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return { token: urlToken, action: 'unsubscribe' };
  }

  // JSON body (our confirmation page). Note: `delete` is intentionally NOT
  // accepted on this token-only path. A leaked unsubscribe token must never
  // be able to hard-delete the account; deletion is gated behind the
  // authenticated /dashboard/settings flow. Token-only callers can only
  // toggle is_active.
  if (contentType.includes('application/json')) {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = (await request.json()) as Record<string, unknown>;
    } catch {
      return { token: urlToken, action: 'unsubscribe' };
    }
    const bodyToken = typeof parsed.token === 'string' ? parsed.token : null;
    const rawAction = typeof parsed.action === 'string' ? parsed.action : 'unsubscribe';
    let action: Action = 'unsubscribe';
    if (rawAction === 'resubscribe') action = 'resubscribe';
    // `delete` is deliberately ignored here.
    return { token: urlToken ?? bodyToken, action };
  }

  // No body or unknown content type — fall back to URL token + unsubscribe.
  return { token: urlToken, action: 'unsubscribe' };
}

export async function POST(request: NextRequest) {
  try {
    const { token, action } = await readToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const userId = verifyUnsubscribeToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or tampered token' }, { status: 403 });
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_active')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Idempotent: re-running the same action is a no-op success. Delete is
    // not idempotent in a meaningful sense — if the user is already gone,
    // the prior profile fetch returned 404 above.
    const alreadyInTargetState =
      (action === 'unsubscribe' && !profile.is_active) ||
      (action === 'resubscribe' && profile.is_active);
    if (alreadyInTargetState) {
      const isFormPost = (request.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded');
      if (isFormPost) {
        return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      return NextResponse.json({ status: action === 'unsubscribe' ? 'already_unsubscribed' : 'already_subscribed' });
    }

    const err = await applyAction(userId, action);
    if (err) {
      console.error(`[unsubscribe] ${action} failed:`, err.message);
      return NextResponse.json({ error: `Failed to ${action}` }, { status: 500 });
    }

    // Gmail expects a plain-text 200 for one-click.
    const isFormPost = (request.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded');
    if (isFormPost) {
      console.log(`[unsubscribe] One-click ${action} for user ${userId}`);
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    const statusByAction: Record<Action, string> = {
      unsubscribe: 'unsubscribed',
      resubscribe: 'resubscribed',
      delete: 'deleted',
    };
    return NextResponse.json({ status: statusByAction[action] });
  } catch (err) {
    console.error('[POST /api/unsubscribe]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET requests are handled by the page at /unsubscribe — this API route only
// implements POST. Adding a GET handler that redirects keeps the URL valid
// when something pastes the bare API URL into a browser by mistake.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const target = token
    ? `/unsubscribe?token=${encodeURIComponent(token)}`
    : '/unsubscribe';
  return NextResponse.redirect(new URL(target, request.url), 302);
}
