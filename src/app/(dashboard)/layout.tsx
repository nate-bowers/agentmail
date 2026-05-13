import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardNav from '@/components/dashboard/DashboardNav';
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
    <div className="min-h-screen bg-background">
      <DashboardNav email={user.email ?? ''} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
