import { createClient } from '@/lib/supabase-server';
import PencarianClient from './PencarianClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Cari Supplier UMKM | ConnectB2B',
};

export default async function PencarianPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Bug 4 Fix: Fetch per-UMKM data, not per-product
  // Get all UMKM with their profile info, products, and equipment
  const { data: umkmList } = await supabase
    .from('umkm')
    .select(`
      id,
      user_id,
      nama_usaha,
      alamat,
      kategori_id,
      kategori (nama_kategori),
      produk (id, nama, harga, gambar_url, deskripsi),
      equipment (id, nama, harga_sewa, gambar_url, deskripsi)
    `)
    .order('id', { ascending: false });

  // Get profile contacts for each UMKM
  const userIds = (umkmList || []).map(u => u.user_id).filter(Boolean);
  
  let profileMap: Record<string, string> = {};
  let userMap: Record<string, string> = {};
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, kontak')
      .in('user_id', userIds);
    
    profiles?.forEach(p => {
      profileMap[p.user_id] = p.kontak || '';
    });

    const { data: usersData } = await supabase
      .from('users')
      .select('id, nama, email, status_verifikasi')
      .in('id', userIds);
    
    usersData?.forEach(u => {
      userMap[u.id] = u.nama || '';
    });
  }

  // Shape data for client
  const formattedUmkm = (umkmList || []).map(u => ({
    id: u.id,
    user_id: u.user_id,
    nama_usaha: u.nama_usaha,
    alamat: u.alamat || '-',
    kategori: (u.kategori as any)?.nama_kategori || 'Umum',
    kontak: profileMap[u.user_id] || '',
    nama_user: userMap[u.user_id] || u.nama_usaha,
    produk: (u.produk as any[]) || [],
    equipment: (u.equipment as any[]) || [],
    totalProduk: ((u.produk as any[]) || []).length + ((u.equipment as any[]) || []).length,
  }));

  return (
    <PencarianClient umkmList={formattedUmkm} />
  );
}
