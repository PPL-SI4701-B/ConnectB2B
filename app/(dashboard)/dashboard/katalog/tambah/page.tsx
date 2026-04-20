import { createClient } from '@/lib/supabase-server';
import ProdukFormClient from './ProdukFormClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Tambah Item Portofolio | ConnectB2B',
};

export default async function TambahProdukPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Pre-fetch auth detail / verification, but guard is basically done in client or page level
  // Cek jika belum verifikasi, lempar kembali agar aman
  const { data: userData } = await supabase
    .from('users')
    .select('status_verifikasi')
    .eq('id', user.id)
    .single();

  if (userData?.status_verifikasi !== 'terverifikasi') {
    redirect('/dashboard/katalog');
  }

  // Fetch data kategori
  const { data: kategoriList } = await supabase
    .from('kategori')
    .select('*')
    .order('nama_kategori');

  return <ProdukFormClient user={user} kategoriList={kategoriList || []} />;
}
