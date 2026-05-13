import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/layout/TopNav';
import { Toaster } from '@/components/ui/sonner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #FFFFFF 100%)' }}
    >
      <TopNav variant="dashboard" email={user.email ?? ''} />
      <main className="py-8">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
