import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getModulePoints, FREE_TIER_POINTS, PRO_TIER_POINTS, getTotalPoints } from '@/lib/modules/points';

const createSchema = z.object({
  module_type: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/modules]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }
    const { module_type, config } = parsed.data;

    if (!MODULE_REGISTRY[module_type]) {
      return NextResponse.json({ error: `Unknown module type: ${module_type}` }, { status: 400 });
    }

    const configParsed = MODULE_REGISTRY[module_type].configSchema.safeParse(config);
    if (!configParsed.success) {
      return NextResponse.json({ error: configParsed.error.flatten() }, { status: 422 });
    }

    // Points-based tier enforcement
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    const isPro = profile?.subscription_status === 'active';
    const pointsLimit = isPro ? PRO_TIER_POINTS : FREE_TIER_POINTS;
    const newModulePoints = getModulePoints(module_type, configParsed.data as Record<string, unknown>);

    const { data: existingModules } = await supabase
      .from('modules')
      .select('module_type, config')
      .eq('user_id', user.id);

    const currentPoints = getTotalPoints(
      (existingModules ?? []) as { module_type: string; config: Record<string, unknown> }[]
    );

    if (currentPoints + newModulePoints > pointsLimit) {
      return NextResponse.json(
        { error: 'points_exceeded', pointsUsed: currentPoints, pointsLimit },
        { status: 403 }
      );
    }

    // Assign display_order = current max + 1
    const { data: existing } = await supabase
      .from('modules')
      .select('display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = ((existing?.[0]?.display_order as number | undefined) ?? -1) + 1;

    const { data, error } = await supabase
      .from('modules')
      .insert({
        user_id: user.id,
        module_type,
        config: configParsed.data,
        display_order: nextOrder,
        is_enabled: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/modules]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
