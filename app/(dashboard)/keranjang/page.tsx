import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import KeranjangClient from './KeranjangClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Keranjang Kolaborasi | ConnectB2B',
};

export default async function KeranjangPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check verifikasi status
  const { data: currentUserData } = await supabase
    .from('users')
    .select('status_verifikasi')
    .eq('id', user.id)
    .single();

  const currentUserVerifikasi = currentUserData?.status_verifikasi || 'menunggu';

  // Get industri_id
  const { data: industri } = await supabase
    .from('industri')
    .select('id, nama_perusahaan')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!industri) {
    // Maybe they are umkm but trying to access keranjang? Just pass empty
    return (
      <div className="p-8 max-w-4xl mx-auto text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">Akses Ditolak</h2>
        <p className="text-gray-500">Halaman ini hanya untuk pengguna industri.</p>
      </div>
    );
  }

  // Fetch keranjang items
  const { data: keranjangItems } = await supabase
    .from('keranjang')
    .select(`
      id, kuantitas,
      produk (id, nama, harga, gambar_url, user_id),
      equipment (id, nama, harga_sewa, gambar_url, user_id)
    `)
    .eq('industri_id', industri.id);

  const itemsList = (keranjangItems as any[]) || [];
  // For each item, we need the UMKM info (to get umkm_id for request)
  // Get all unique user_ids from produk and equipment
  const userIds = new Set<string>();
  itemsList.forEach(item => {
    if (item.produk?.user_id) userIds.add(item.produk.user_id);
    if (item.equipment?.user_id) userIds.add(item.equipment.user_id);
  });

  const { data: umkms } = await supabase
    .from('umkm')
    .select('id, user_id, nama_usaha')
    .in('user_id', Array.from(userIds));

  const umkmMap = new Map();
  umkms?.forEach(u => umkmMap.set(u.user_id, u));

  // Format data for client
  const formattedItems = itemsList.map(item => {
    const isProduk = !!item.produk;
    const refItem = item.produk || item.equipment;
    const umkmInfo = umkmMap.get(refItem.user_id);
    const typeString: 'produk' | 'equipment' = isProduk ? 'produk' : 'equipment';
    return {
      id: item.id,
      kuantitas: item.kuantitas,
      type: typeString,
      item_id: refItem.id,
      nama: refItem.nama,
      harga: isProduk ? refItem.harga : refItem.harga_sewa,
      gambar_url: refItem.gambar_url,
      umkm_id: umkmInfo?.id,
      nama_usaha: umkmInfo?.nama_usaha,
      umkm_user_id: refItem.user_id
    };
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Keranjang Kolaborasi</h1>
      <KeranjangClient 
        items={formattedItems} 
        industriId={industri.id} 
        industriName={industri.nama_perusahaan}
        currentUserVerifikasi={currentUserVerifikasi} 
      />
    </div>
  );
}
