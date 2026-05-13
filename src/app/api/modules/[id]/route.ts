import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { MODULE_REGISTRY } from '@/lib/modules';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const patchSchema = z
  .object({
    config: z.record(z.string(), z.unknown()).optional(),
    is_enabled: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    // Verify ownership and fetch module type for config validation
    const { data: existing, error: fetchError } = await supabase
      .from('modules')
      .select('module_type, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.config !== undefined) {
      const def = MODULE_REGISTRY[existing.module_type];
      if (def) {
        const configParsed = def.configSchema.safeParse(parsed.data.config);
        if (!configParsed.success) {
          return NextResponse.json({ error: configParsed.error.flatten() }, { status: 422 });
        }
        updates.config = configParsed.data;
      } else {
        updates.config = parsed.data.config;
      }
    }

    if (parsed.data.is_enabled !== undefined) updates.is_enabled = parsed.data.is_enabled;
    if (parsed.data.display_order !== undefined) updates.display_order = parsed.data.display_order;

    const { data, error } = await supabase
      .from('modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[PATCH /api/modules/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    // Verify ownership before deleting
    const { data: existing } = await supabase
      .from('modules')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/modules/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
