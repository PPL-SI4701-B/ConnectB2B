import { createClient } from '@/lib/supabase-server';
import PencarianClient from './PencarianClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Katalog Publik | ConnectB2B',
};

export default async function PencarianPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get all products and join with users and umkm tables to get the vendor name
  // Note: Since umkm references user_id, we can join it directly or via users
  // We'll fetch all products first
  const { data: produkList } = await supabase
    .from('produk')
    .select('*, users (nama)');
    
  const { data: equipmentList } = await supabase
    .from('equipment')
    .select('*, users (nama)');

  // We can fetch UMKM names mapping to user_ids to display actual company names
  const { data: umkmList } = await supabase
    .from('umkm')
    .select('user_id, nama_usaha');
    
  const umkmMap: Record<string, string> = {};
  if (umkmList) {
    umkmList.forEach(u => {
      umkmMap[u.user_id] = u.nama_usaha;
    });
  }

  // Map products
  const formattedProduk = (produkList || []).map(p => ({
    ...p,
    type: 'produk',
    vendorName: umkmMap[p.user_id] || p.users?.nama || 'UMKM Tidak Diketahui',
    rating: 0 // Mock rating as per requirements, since rating column might not exist or we don't have ulasan yet
  }));
  
  // Map equipment
  const formattedEquipment = (equipmentList || []).map(e => ({
    ...e,
    type: 'equipment',
    vendorName: umkmMap[e.user_id] || e.users?.nama || 'UMKM Tidak Diketahui',
    rating: 0,
    harga: e.harga_sewa // Mapping for common sorting
  }));

  const allItems = [...formattedProduk, ...formattedEquipment];

  return (
    <PencarianClient items={allItems} />
  );
}
