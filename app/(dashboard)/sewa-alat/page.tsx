import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import SewaAlatClient from './SewaAlatClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Direktori Alat Produksi | ConnectB2B',
};

export default async function SewaAlatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check verifikasi status of the current user
  const { data: currentUserData } = await supabase
    .from('users')
    .select('status_verifikasi')
    .eq('id', user.id)
    .single();

  const currentUserVerifikasi = currentUserData?.status_verifikasi || 'menunggu';

  // Fetch all equipment with their owner's UMKM info
  // We need to fetch from `equipment` and join `umkm` via user_id
  const { data: equipments, error } = await supabase
    .from('equipment')
    .select(`
      id,
      nama,
      deskripsi,
      harga_sewa,
      status,
      user_id
    `)
    .eq('status', 'tersedia')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error fetching equipments:', error);
  }

  // Fetch UMKM info for those equipments
  const userIds = new Set<string>();
  const equipmentsList = (equipments as any[]) || [];
  equipmentsList.forEach(e => userIds.add(e.user_id));

  let umkmMap = new Map();
  if (userIds.size > 0) {
    const { data: umkms } = await supabase
      .from('umkm')
      .select('id, user_id, nama_usaha, alamat, kategori_id, kategori(nama_kategori)')
      .in('user_id', Array.from(userIds));

    umkms?.forEach(u => umkmMap.set(u.user_id, u));
  }

  // Format data
  const formattedEquipments = equipmentsList.map(eq => {
    const ownerUmkm = umkmMap.get(eq.user_id);
    return {
      ...eq,
      owner_umkm_id: ownerUmkm?.id,
      owner_nama_usaha: ownerUmkm?.nama_usaha || 'UMKM Tidak Diketahui',
      owner_alamat: ownerUmkm?.alamat || '-',
      owner_kategori: ownerUmkm?.kategori?.nama_kategori || 'Umum',
    };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-black">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">Halaman / Sewa Alat</div>
          <h1 className="text-3xl font-bold text-gray-900">Direktori Alat Produksi Lintas-UMKM</h1>
        </div>
      </header>

      <SewaAlatClient
        equipments={formattedEquipments}
        currentUserVerifikasi={currentUserVerifikasi}
      />
    </div>
  );
}
