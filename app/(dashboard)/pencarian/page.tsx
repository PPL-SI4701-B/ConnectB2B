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
  const kategoriParam = searchParams.kategori;
  const kategori = Array.isArray(kategoriParam) ? kategoriParam : typeof kategoriParam === 'string' ? [kategoriParam] : undefined;
  
  const lokasi = typeof searchParams.lokasi === 'string' ? searchParams.lokasi : undefined;
  const minHarga = typeof searchParams.minHarga === 'string' ? parseInt(searchParams.minHarga) : undefined;
  const maxHarga = typeof searchParams.maxHarga === 'string' ? parseInt(searchParams.maxHarga) : undefined;
  // If not set, default to verifiedOnly = true to match previous behavior
  const verifiedOnly = searchParams.verifiedOnly !== 'false';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: currentUserData } = await supabase
    .from('users')
    .select('status_verifikasi')
    .eq('id', user.id)
    .single();

  const currentUserVerifikasi = currentUserData?.status_verifikasi || 'menunggu';


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

  // Fetch all categories for dropdown — deduplicate to avoid duplicate React keys
  const { data: categories } = await supabase
    .from('kategori')
    .select('id, nama_kategori')
    .order('nama_kategori', { ascending: true });
    
  // Use id-based dedup to prevent same-name categories from appearing twice
  const seen = new Set<string>();
  const categoryNames = (categories || [])
    .filter(c => {
      if (seen.has(c.nama_kategori)) return false;
      seen.add(c.nama_kategori);
      return true;
    })
    .map(c => c.nama_kategori);

  // Shape data for client
  const formattedUmkm = (usersList || []).map(u => {
    // umkm might be an array or an object depending on the relationship. Usually it's an array for 1:N
    const umkmData = Array.isArray(u.umkm) ? u.umkm[0] : u.umkm;
    const umkmNumericId = umkmData?.id ? Number(umkmData.id) : null;
    
    return {
      // Use umkm numeric id if available, otherwise keep user_id for key (avoid NaN)
      id: umkmNumericId ?? u.id, // can be number or string — both work as React keys
      user_id: u.id,
      nama_usaha: umkmData?.nama_usaha || u.nama,
      alamat: umkmData?.alamat || '-',
      kategori: umkmData?.kategori?.nama_kategori || 'Umum',
      kontak: profileMap[u.id] || '',
      nama_user: u.nama || '',
      status_verifikasi: u.status_verifikasi,
      produk: (u.produk as any[]) || [],
      equipment: (u.equipment as any[]) || [],
      totalProduk: ((u.produk as any[]) || []).length + ((u.equipment as any[]) || []).length,
    };
  });

  // Extract unique locations for the dropdown
  const uniqueLocationsSet = new Set<string>();
  formattedUmkm.forEach(u => {
    if (u.alamat && u.alamat !== '-') {
      // Basic extraction of city/province if needed, but here we just use the raw string or let the user search.
      // For simplicity, we just use the unique raw alamat values for now or let the user type in.
      // If we want a dropdown, we should pass unique non-empty addresses.
      uniqueLocationsSet.add(u.alamat);
    }
  });
  const locations = Array.from(uniqueLocationsSet).sort();

  // Server-side search and clustering
  const filteredUmkm = searchAndClusterUmkm(formattedUmkm, {
    keyword: q,
    kategoriList: kategori,
    lokasi,
    minHarga,
    maxHarga,
    verifiedOnly
  });

  return (
    <PencarianClient 
      umkmList={filteredUmkm} 
      categories={categoryNames}
      locations={locations}
      initialQuery={q || ''}
      initialCategoryList={kategori || []}
      initialLokasi={lokasi || ''}
      initialMinHarga={minHarga}
      initialMaxHarga={maxHarga}
      initialVerifiedOnly={verifiedOnly}
      currentUserVerifikasi={currentUserVerifikasi}
    />
  );
}
