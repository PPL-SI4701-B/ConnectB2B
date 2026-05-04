import { createClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import AlatFormClient from '../../../tambah-alat/AlatFormClient';

export const metadata = {
  title: 'Edit Alat & Mesin | ConnectB2B',
};

export default async function EditAlatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch equipment data
  const { data: alat } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', Number(id))
    .eq('user_id', user.id)
    .single();

  if (!alat) {
    notFound();
  }

  return (
    <AlatFormClient user={user} initialData={alat} />
  );
}
