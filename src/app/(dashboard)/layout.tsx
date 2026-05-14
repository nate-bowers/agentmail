import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/layout/TopNav';
import { Toaster } from '@/components/ui/sonner';
import { getPlanFromSubscriptionStatus } from '@/lib/stripe/plans';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  const planId = getPlanFromSubscriptionStatus(profile?.subscription_status ?? null);
  const isPro = planId === 'pro' || planId === 'unlimited';

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #FFFFFF 100%)' }}
    >
      <TopNav variant="dashboard" email={user.email ?? ''} isPro={isPro} />
      <main className="py-8">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
