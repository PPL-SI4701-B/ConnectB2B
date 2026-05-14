import { createClient } from '@/lib/supabase-server';
import PencarianClient from './PencarianClient';
import { redirect } from 'next/navigation';
import { searchAndClusterUmkm } from '@/lib/searchAlgorithm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Cari Supplier UMKM | ConnectB2B',
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PencarianPage(props: Props) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const kategori = typeof searchParams.kategori === 'string' ? searchParams.kategori : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Bug Fix: Fetch from users table to correctly join produk, equipment, and umkm profiles
  const { data: usersList, error } = await supabase
    .from('users')
    .select(`
      id,
      nama,
      email,
      status_verifikasi,
      umkm (id, nama_usaha, alamat, kategori_id, kategori(nama_kategori)),
      produk (id, nama, harga, gambar_url, deskripsi),
      equipment (id, nama, harga_sewa, deskripsi, gambar_url)
    `)
    .eq('role', 'umkm')
    .eq('status_verifikasi', 'terverifikasi')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching suppliers:', error);
  }

  // Get profile contacts
  const userIds = (usersList || []).map(u => u.id);
  let profileMap: Record<string, string> = {};
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, kontak')
      .in('user_id', userIds);
    
    profiles?.forEach(p => {
      profileMap[p.user_id] = p.kontak || '';
    });
  }

  // Fetch all categories for dropdown
  const { data: categories } = await supabase
    .from('kategori')
    .select('nama_kategori')
    .order('nama_kategori', { ascending: true });
    
  const categoryNames = (categories || []).map(c => c.nama_kategori);

  // Shape data for client
  const formattedUmkm = (usersList || []).map(u => {
    // umkm might be an array or an object depending on the relationship. Usually it's an array for 1:N
    const umkmData = Array.isArray(u.umkm) ? u.umkm[0] : u.umkm;
    
    return {
      id: umkmData?.id || u.id, // Fallback to user id if umkm id is missing
      user_id: u.id,
      nama_usaha: umkmData?.nama_usaha || u.nama,
      alamat: umkmData?.alamat || '-',
      kategori: umkmData?.kategori?.nama_kategori || 'Umum',
      kontak: profileMap[u.id] || '',
      nama_user: u.nama || '',
      produk: (u.produk as any[]) || [],
      equipment: (u.equipment as any[]) || [],
      totalProduk: ((u.produk as any[]) || []).length + ((u.equipment as any[]) || []).length,
    };
  });

  // Server-side search and clustering
  const filteredUmkm = searchAndClusterUmkm(formattedUmkm, q, kategori);

  return (
    <PencarianClient 
      umkmList={filteredUmkm} 
      categories={categoryNames}
      initialQuery={q || ''}
      initialCategory={kategori || ''}
    />
  );
}
