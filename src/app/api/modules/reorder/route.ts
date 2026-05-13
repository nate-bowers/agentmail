import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const reorderSchema = z.object({
  order: z.array(z.object({
    id: z.string().uuid(),
    display_order: z.number().int().min(0),
  })).min(1),
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

    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { order } = parsed.data;

    // Verify all modules belong to this user
    const { data: existing } = await supabase
      .from('modules')
      .select('id')
      .eq('user_id', user.id)
      .in('id', order.map((o) => o.id));

    if (!existing || existing.length !== order.length) {
      return NextResponse.json({ error: 'One or more modules not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('modules')
      .upsert(
        order.map(({ id, display_order }) => ({ id, display_order, user_id: user.id })),
        { onConflict: 'id' }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/modules/reorder]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
