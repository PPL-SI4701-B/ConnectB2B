import { createClient } from '@/lib/supabase-server';
import ProdukFormClient from '../../tambah/ProdukFormClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Edit Item Portofolio | ConnectB2B',
};

export default async function EditProdukPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Pre-fetch auth detail / verification
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

  // Fetch existing product data
  const { data: produk } = await supabase
    .from('produk')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id) // pastikan milik user yg login
    .single();

  if (!produk) {
    redirect('/dashboard/katalog');
  }

  return <ProdukFormClient user={user} kategoriList={kategoriList || []} initialData={produk} />;
}
