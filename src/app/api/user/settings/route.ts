import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

const settingsSchema = z.object({
  full_name: z.string().max(100).nullable().optional(),
  timezone: z.string().min(1).max(100).optional(),
  // Accept "HH:MM" from the time input; store as "HH:MM:00" for Postgres time type
  send_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Expected HH:MM format')
    .transform((t) => `${t}:00`)
    .optional(),
  is_active: z.boolean().optional(),
  email_theme: z.string().min(1).max(20).optional(),
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

    const { error } = await supabase
      .from('profiles')
      .update(parsed.data)
      .eq('id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/user/settings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
