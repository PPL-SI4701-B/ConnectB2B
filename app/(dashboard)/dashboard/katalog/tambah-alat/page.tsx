import { createClient } from '@/lib/supabase-server';
import AlatFormClient from './AlatFormClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Tambah Alat | ConnectB2B',
};

export default async function TambahAlatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Cek verifikasi
  const { data: userData } = await supabase
    .from('users')
    .select('status_verifikasi')
    .eq('id', user.id)
    .single() as any;

  if ((userData?.status_verifikasi as string) !== 'terverifikasi') {
    redirect('/dashboard/katalog');
  }

  return <AlatFormClient user={user} />;
}
