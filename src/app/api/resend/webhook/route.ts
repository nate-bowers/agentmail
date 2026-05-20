// Resend webhook receiver.
//
// Resend signs every webhook with Svix-compatible headers (svix-id,
// svix-timestamp, svix-signature). We verify the raw body — do NOT JSON.parse
// before verification or signatures will not match.
//
// What we action today:
//   - email.bounced     -> set profiles.is_active = false (hard bounces in
//                          particular, but any bounce is treated as a stop
//                          signal to protect sender reputation)
//   - email.complained  -> set profiles.is_active = false
//
// Everything else (delivered, opened, clicked, sent, etc.) is logged and
// acked with 200. We never throw 5xx on signature-valid payloads, since
// Resend retries on 5xx and we would just keep churning.
//
// Setup (manual, one-time):
//   1. In the Resend dashboard, add a webhook endpoint pointing at
//      https://dailybriefmail.com/api/resend/webhook
//   2. Copy the signing secret (starts with whsec_) into Vercel as
//      RESEND_WEBHOOK_SECRET (Production + Preview + Development).

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { adminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ResendBounceData = {
  email_id?: string;
  to?: string | string[];
  bounce?: { type?: string; subType?: string; message?: string };
  bounce_type?: string;
};

type ResendComplaintData = {
  email_id?: string;
  to?: string | string[];
  complaint?: { type?: string; feedback_type?: string };
};

type ResendGenericData = {
  email_id?: string;
  to?: string | string[];
};

type ResendEvent =
  | { type: 'email.bounced'; created_at?: string; data: ResendBounceData }
  | { type: 'email.complained'; created_at?: string; data: ResendComplaintData }
  | { type: string; created_at?: string; data: ResendGenericData };

const ACTIONABLE_TYPES = new Set(['email.bounced', 'email.complained']);

function firstRecipient(to: string | string[] | undefined): string | null {
  if (!to) return null;
  if (Array.isArray(to)) return to[0] ?? null;
  return to;
}

function isHardBounce(data: ResendBounceData): boolean {
  const t = (data.bounce?.type ?? data.bounce_type ?? '').toLowerCase();
  return t === 'hard' || t === 'permanent';
}

async function deactivateByEmail(
  recipient: string,
  reason: 'bounced' | 'complained',
  detail: string,
): Promise<{ matched: boolean; profileId?: string }> {
  const admin = adminClient;
  const lowered = recipient.toLowerCase();

  // A profile can receive at either profiles.email (the auth email) or
  // profiles.delivery_email (a user-chosen alternate). Match either.
  const { data: rows, error } = await admin
    .from('profiles')
    .select('id, email, delivery_email, is_active')
    .or(`email.eq.${lowered},delivery_email.eq.${lowered}`)
    .limit(1);

  if (error) {
    console.error(`[resend-webhook] profile lookup failed for ${lowered}: ${error.message}`);
    return { matched: false };
  }

  const profile = rows?.[0];
  if (!profile) {
    console.warn(
      `[resend-webhook] ${reason} for ${lowered} but no matching profile (detail: ${detail})`,
    );
    return { matched: false };
  }

  if (!profile.is_active) {
    console.log(
      `[resend-webhook] ${reason} for ${lowered} (profile ${profile.id}) — already inactive, no-op`,
    );
    return { matched: true, profileId: profile.id };
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ is_active: false })
    .eq('id', profile.id);

  if (updateError) {
    console.error(
      `[resend-webhook] failed to deactivate profile ${profile.id}: ${updateError.message}`,
    );
    return { matched: true, profileId: profile.id };
  }

  console.log(
    `[resend-webhook] deactivated profile ${profile.id} (${lowered}) reason=${reason} detail=${detail}`,
  );
  return { matched: true, profileId: profile.id };
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET is not set');
    // Return 500 here is fine — this is a server misconfig, not a signature
    // failure. Resend will retry and we want the alarm to keep ringing.
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const rawBody = await request.text();

  const svixId = request.headers.get('svix-id') ?? '';
  const svixTimestamp = request.headers.get('svix-timestamp') ?? '';
  const svixSignature = request.headers.get('svix-signature') ?? '';

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('[resend-webhook] missing svix headers');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendEvent;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[resend-webhook] signature verification failed: ${msg}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const type = event.type;

  if (!ACTIONABLE_TYPES.has(type)) {
    // Delivered / opened / clicked / sent / etc — record and move on.
    console.log(`[resend-webhook] received non-actionable event type=${type}, ignoring`);
    return NextResponse.json({ ok: true });
  }

  const recipient = firstRecipient(event.data?.to);
  if (!recipient) {
    console.warn(`[resend-webhook] ${type} event with no recipient, skipping`);
    return NextResponse.json({ ok: true });
  }

  if (type === 'email.bounced') {
    const data = event.data as ResendBounceData;
    const detail = isHardBounce(data)
      ? `hard bounce (${data.bounce?.subType ?? data.bounce?.type ?? 'unknown'})`
      : `soft/other bounce (${data.bounce?.type ?? 'unknown'})`;
    // We deactivate on any bounce. Soft bounces that repeat would otherwise
    // accumulate retry attempts each day; we stop the loop on first signal.
    await deactivateByEmail(recipient, 'bounced', detail);
    return NextResponse.json({ ok: true });
  }

  if (type === 'email.complained') {
    const data = event.data as ResendComplaintData;
    const detail = data.complaint?.feedback_type ?? data.complaint?.type ?? 'complaint';
    await deactivateByEmail(recipient, 'complained', detail);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
