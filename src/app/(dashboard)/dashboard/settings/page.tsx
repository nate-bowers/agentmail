import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/dashboard/SettingsForm';
import PageShell from '@/components/layout/PageShell';
import type { Profile } from '@/types';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, timezone, send_time')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your send schedule and account.
          </p>
        </div>
        <SettingsForm profile={profile as Pick<Profile, 'full_name' | 'timezone' | 'send_time'>} />
      </div>
    </PageShell>
  );
}
