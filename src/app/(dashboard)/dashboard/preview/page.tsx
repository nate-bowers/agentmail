import { redirect } from 'next/navigation';
import { render } from '@react-email/render';
import { format } from 'date-fns';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { generateDailyBrief } from '@/lib/email/generate';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';
import TestSendButton from '@/components/dashboard/TestSendButton';
import PageShell from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import type { ModuleRow, Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({
  searchParams,
}: {
  searchParams?: { generate?: string };
}) {
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
  const shouldGenerate = searchParams?.generate === '1';

  const pageHeader = (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-xl font-semibold">Preview Your Brief</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live preview generated with your current modules.
        </p>
      </div>
      <TestSendButton />
    </div>
  );

  // Show gate if no modules enabled
  if (enabledModules.length === 0) {
    return (
      <PageShell>
        <div className="space-y-6">
          {pageHeader}
          <div className="flex flex-col items-center justify-center rounded-xl border border-surface-border bg-white py-16 text-center">
            <p className="font-medium text-ink">No modules enabled</p>
            <p className="mt-1 text-sm text-ink-muted">
              Enable at least one module to preview your daily brief.
            </p>
            <Button className="mt-5" asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // Show generate prompt if not yet triggered
  if (!shouldGenerate) {
    return (
      <PageShell>
        <div className="space-y-6">
          {pageHeader}
          <div className="flex flex-col items-center justify-center rounded-xl border border-surface-border bg-white py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple-light">
              <Sparkles className="h-6 w-6 text-brand-purple" />
            </div>
            <p className="font-medium text-ink">Ready to preview your brief?</p>
            <p className="mt-1 text-sm text-ink-muted">
              Generating calls the AI and may take 15–30 seconds.
            </p>
            <Button className="mt-5" asChild>
              <Link href="/dashboard/preview?generate=1">Generate preview</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // Generate the preview
  let html = '';
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
        unsubscribeToken: 'preview',
      })
    );
  } catch (err) {
    console.error('[preview] Failed to generate brief:', err);
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {pageHeader}

        {errorMessage ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
              <p className="font-medium">Failed to generate preview</p>
              <p className="mt-1 text-xs opacity-80">{errorMessage}</p>
            </div>
            <div className="text-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/preview?generate=1">Try again</Link>
              </Button>
            </div>
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
    </PageShell>
  );
}
