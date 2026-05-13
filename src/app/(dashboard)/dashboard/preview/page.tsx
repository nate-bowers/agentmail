import { redirect } from 'next/navigation';
import { render } from '@react-email/render';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { generateDailyBrief } from '@/lib/email/generate';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import TestSendButton from '@/components/dashboard/TestSendButton';
import type { ModuleRow, Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function PreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: modules }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('modules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true }),
  ]);

  if (!profile) redirect('/login');

  const p = profile as Profile;
  const enabledModules = (modules ?? []) as ModuleRow[];

  // If no modules are enabled, show a placeholder
  if (enabledModules.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Preview Your Brief</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enable at least one module to preview your daily brief.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No modules enabled.</p>
        </div>
      </div>
    );
  }

  let html: string;
  let errorMessage: string | null = null;

  try {
    const brief = await generateDailyBrief(
      { email: p.email, full_name: p.full_name },
      enabledModules
    );

    const dateLabel = format(new Date(), 'EEEE, MMMM d, yyyy');

    html = await render(
      DailyBriefEmail({
        userName: p.full_name ?? p.email,
        date: dateLabel,
        sections: brief.sections,
        // Omit unsubscribe token in preview — link won't work but layout is accurate
        unsubscribeToken: 'preview',
      })
    );
  } catch (err) {
    console.error('[preview] Failed to generate brief:', err);
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
    html = '';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Preview Your Brief</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live preview generated with your current modules.
          </p>
        </div>
        <TestSendButton />
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          <p className="font-medium">Failed to generate preview</p>
          <p className="mt-1 text-xs opacity-80">{errorMessage}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <iframe
            srcDoc={html}
            className="h-[800px] w-full"
            title="Email preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
