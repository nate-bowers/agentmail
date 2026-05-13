import { createAdminClient } from '@/lib/supabase/admin';
import { buildSearchInstructions } from '@/lib/modules';
import { generateDailyBrief } from '@/lib/email/generate';
import { sendDailyBrief } from '@/lib/email/send';
import type { ModuleRow } from '@/types';

export interface PipelineResult {
  success: boolean;
  stage: 'modules' | 'generate' | 'send' | 'complete';
  error?: string;
  detail?: string;
  tokensUsed?: number;
  emailId?: string;
}

export async function runPipeline(user: {
  id: string;
  email: string;
  full_name: string | null;
  email_theme: string;
  timezone: string;
}): Promise<PipelineResult> {
  const supabase = createAdminClient();

  // STAGE 1: Fetch modules
  console.log(`[Pipeline] Stage 1: Fetching modules for ${user.email}`);

  let modules: ModuleRow[];
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, stage: 'modules', error: 'No enabled modules found for this user' };
    }

    modules = data as ModuleRow[];
    console.log(`[Pipeline] Found ${modules.length} modules:`, modules.map((m) => m.module_type));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Module fetch failed:', err);
    return { success: false, stage: 'modules', error: message, detail: String(err) };
  }

  // STAGE 2: Build search instructions
  console.log('[Pipeline] Stage 2: Building search instructions');
  let moduleInstructions;
  try {
    moduleInstructions = buildSearchInstructions(modules);
    console.log('[Pipeline] Instructions built for:', moduleInstructions.map((m) => m.moduleType));

    if (moduleInstructions.length === 0) {
      return { success: false, stage: 'modules', error: 'No valid module configs after parsing' };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Instruction build failed:', err);
    return { success: false, stage: 'generate', error: message, detail: String(err) };
  }

  // STAGE 3: Generate via Claude
  console.log('[Pipeline] Stage 3: Calling Claude API');
  let generated;
  try {
    generated = await generateDailyBrief(user, moduleInstructions);
    console.log('[Pipeline] Generation successful. Tokens used:', generated.tokensUsed);
    console.log('[Pipeline] Sections generated:', generated.sections?.map((s) => s.type));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Claude generation failed:', err);
    return { success: false, stage: 'generate', error: message, detail: String(err) };
  }

  // STAGE 4: Send email (send.ts handles DB logging internally)
  console.log('[Pipeline] Stage 4: Sending via Resend');
  let sendResult;
  try {
    sendResult = await sendDailyBrief(user, generated);
    console.log('[Pipeline] Send result:', sendResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Send failed:', err);
    return { success: false, stage: 'send', error: message, detail: String(err) };
  }

  if (!sendResult.success) {
    return { success: false, stage: 'send', error: sendResult.error };
  }

  return {
    success: true,
    stage: 'complete',
    tokensUsed: generated.tokensUsed,
    emailId: sendResult.emailId,
  };
}
