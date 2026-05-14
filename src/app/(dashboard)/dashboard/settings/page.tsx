import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/dashboard/SettingsForm';
import PageShell from '@/components/layout/PageShell';

export const metadata = {
  title: 'Settings — Daily Brief',
  description: 'Manage your Daily Brief account, delivery schedule, and subscription.',
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, send_time, subscription_status, is_active')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile, delivery schedule, and subscription.
          </p>
        </div>
        <SettingsForm
          profile={{
            full_name: profile.full_name,
            send_time: profile.send_time,
            subscription_status: profile.subscription_status,
            is_active: profile.is_active,
          }}
          email={user.email ?? ''}
        />
      </div>
    </PageShell>
  );
}
