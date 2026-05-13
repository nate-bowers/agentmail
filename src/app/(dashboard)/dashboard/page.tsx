import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PageShell from '@/components/layout/PageShell';
import DashboardClient from '@/components/dashboard/DashboardClient';
import type { ModuleRow, Profile } from '@/types';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your Daily Brief modules and delivery settings.',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: modules }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('modules').select('*').eq('user_id', user.id).order('display_order', { ascending: true }),
  ]);

  if (!profile) redirect('/login');

  const p = profile as Profile;
  const isPro = p.subscription_status === 'active';
  const moduleList = (modules ?? []) as ModuleRow[];

  return (
    <PageShell>
      <DashboardClient
        initialModules={moduleList}
        profile={p}
        user={{ id: user.id, email: user.email ?? '' }}
        isPro={isPro}
      />
    </PageShell>
  );
}
