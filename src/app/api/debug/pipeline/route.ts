// TODO: Remove this endpoint before public launch or add auth check

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSearchInstructions } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import type { ModuleRow } from '@/types';

export async function GET() {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output: Record<string, any> = {};

  // Step 1: Find users and their modules
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, full_name, email_theme, timezone')
    .limit(5);

  const { data: allModules, error: modulesError } = await supabase
    .from('modules')
    .select('*')
    .eq('is_enabled', true);

  output.usersQueryError = usersError?.message ?? null;
  output.modulesQueryError = modulesError?.message ?? null;
  output.usersFound = users?.length ?? 0;
  output.totalModulesFound = allModules?.length ?? 0;
  output.modulesByUser = (allModules ?? []).reduce<Record<string, string[]>>((acc, m: ModuleRow) => {
    acc[m.user_id] = acc[m.user_id] ?? [];
    acc[m.user_id].push(m.module_type);
    return acc;
  }, {});

  const user = users?.find((u) =>
    (allModules ?? []).some((m: ModuleRow) => m.user_id === u.id)
  );

  if (!user) {
    return NextResponse.json({
      ...output,
      error: 'No user with modules found. Add modules to your dashboard.',
    }, { status: 400 });
  }

  output.targetUser = user.email;
  const userModules = (allModules ?? []).filter((m: ModuleRow) => m.user_id === user.id) as ModuleRow[];
  output.userModules = userModules.map((m) => ({ type: m.module_type, config: m.config }));

  // Step 2: Build instructions
  let instructions;
  try {
    instructions = buildSearchInstructions(userModules);
    output.instructionsBuilt = instructions.map((i) => ({
      type: i.moduleType,
      instructionPreview: i.searchInstruction.slice(0, 100) + '...',
    }));
  } catch (err: unknown) {
    output.instructionError = err instanceof Error ? err.message : String(err);
    return NextResponse.json(output, { status: 500 });
  }

  // Step 3: Generate via Claude
  let generated;
  try {
    generated = await generateDailyBrief(user, instructions);
    output.generationSuccess = true;
    output.tokensUsed = generated.tokensUsed;
    output.introPreview = generated.intro?.slice(0, 100);
    output.sectionsGenerated = generated.sections?.map((s) => s.type);
    output.rawSections = generated.sections;
  } catch (err: unknown) {
    output.generationError = err instanceof Error ? err.message : String(err);
    output.generationDetail = String(err);
    return NextResponse.json(output, { status: 500 });
  }

  // Step 4: Test render (no send)
  try {
    const { render } = await import('@react-email/render');
    const { default: DailyBriefEmail } = await import('@/components/email/DailyBriefEmail');

    const html = await render(DailyBriefEmail({
      userName: user.full_name?.split(' ')[0] ?? 'there',
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      }),
      intro: generated.intro || undefined,
      sections: generated.sections,
      theme: user.email_theme ?? 'light',
      unsubscribeToken: 'test-token',
    }));

    output.renderSuccess = true;
    output.htmlLength = html.length;
    output.htmlPreview = html.slice(0, 200);
  } catch (err: unknown) {
    output.renderError = err instanceof Error ? err.message : String(err);
    return NextResponse.json(output, { status: 500 });
  }

  output.allStagesPassed = true;
  output.readyToSend = true;

  return NextResponse.json(output, { status: 200 });
}
