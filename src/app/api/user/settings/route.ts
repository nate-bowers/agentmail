import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { ianaTimezoneSchema } from '@/lib/validation/timezone';
import {
  isDisposableEmail,
  extractDomain,
  DISPOSABLE_REJECTION_MESSAGE,
} from '@/lib/security/disposableEmail';

const settingsSchema = z.object({
  full_name: z.string().max(100).nullable().optional(),
  timezone: ianaTimezoneSchema.optional(),
  // Accept "HH:MM" from the time input; store as "HH:MM:00" for Postgres time type
  send_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Expected HH:MM format')
    .transform((t) => `${t}:00`)
    .optional(),
  is_active: z.boolean().optional(),
  email_theme: z.string().min(1).max(20).optional(),
  email_verbosity: z.enum(['succinct', 'medium', 'wordy']).optional(),
  // null resets to account email; empty string treated as null
  delivery_email: z.union([
    z.string().email('Please enter a valid email address'),
    z.literal(''),
    z.null(),
  ]).optional().transform((v) => (v === '' ? null : v)),
  has_onboarded: z.boolean().optional(),
  onboarding_step: z.number().int().min(0).max(10).optional(),
  onboarding_test_email_acknowledged: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    if (parsed.data.delivery_email && isDisposableEmail(parsed.data.delivery_email)) {
      console.warn('[user/settings] rejected disposable delivery_email domain:', extractDomain(parsed.data.delivery_email));
      return NextResponse.json(
        { error: 'disposable_email', field: 'delivery_email', message: DISPOSABLE_REJECTION_MESSAGE },
        { status: 422 }
      );
    }

    const { error } = await supabase
      .from('profiles')
      .update(parsed.data)
      .eq('id', user.id);

    if (error) { console.error('[user/settings]', error.message); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/user/settings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Sign the user out *before* deleting them so the session cookie is
    // invalidated and revoked. Otherwise the cookie remains technically valid
    // until the next page nav fails an RLS check — a small window where the
    // user's just-deleted session is still server-trusted.
    await supabase.auth.signOut();

    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) { console.error('[user/settings]', error.message); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/user/settings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
