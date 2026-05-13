import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ModuleBuilderClient from '@/components/dashboard/ModuleBuilderClient';
import type { ModuleRow } from '@/types';

interface BuilderPageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function BuilderPage({ searchParams }: BuilderPageProps) {
  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let initialModule: Pick<ModuleRow, 'id' | 'module_type' | 'config'> | null = null;

  if (edit) {
    const { data } = await supabase
      .from('modules')
      .select('id, module_type, config')
      .eq('id', edit)
      .eq('user_id', user.id) // ensure ownership
      .single();

    if (data) {
      initialModule = data as Pick<ModuleRow, 'id' | 'module_type' | 'config'>;
    }
  }

  return <ModuleBuilderClient initialModule={initialModule} />;
}
