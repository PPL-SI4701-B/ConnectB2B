import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import CartClient from './CartClient';

export const metadata = {
  title: 'Keranjang Kolaborasi | ConnectB2B',
};

export const dynamic = 'force-dynamic';

export default async function KeranjangPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: industri } = await supabase
    .from('industri')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!industri) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center text-gray-500">
        Profil industri Anda belum lengkap atau Anda bukan entitas industri. Lengkapi profil Anda terlebih dahulu.
      </div>
    );
  }

  // Fetch cart items
  const { data: cartItems, error } = await supabase
    .from('keranjang')
    .select(`
      id,
      kuantitas,
      produk_id,
      equipment_id,
      produk:produk_id (id, nama, harga, gambar_url, user_id),
      equipment:equipment_id (id, nama, harga_sewa, gambar_url, user_id)
    `)
    .eq('industri_id', industri.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cart:', error);
  }

  // Extract user_ids to find umkm details
  const userIds = new Set<string>();
  cartItems?.forEach(item => {
    // Note: Supabase JS types relationships as any or array depending on schema. 
    // We assume 1:1 for produk -> user, so it should be an object.
    const p = Array.isArray(item.produk) ? item.produk[0] : item.produk;
    const e = Array.isArray(item.equipment) ? item.equipment[0] : item.equipment;
    
    if (p?.user_id) userIds.add(p.user_id);
    if (e?.user_id) userIds.add(e.user_id);
  });

  let umkmMap: Record<string, any> = {};
  if (userIds.size > 0) {
    const { data: umkms } = await supabase
      .from('umkm')
      .select('id, nama_usaha, user_id')
      .in('user_id', Array.from(userIds));
    
    umkms?.forEach(u => {
      umkmMap[u.user_id] = u;
    });
  }

  const formattedCartItems = (cartItems || []).map(item => {
    const p = Array.isArray(item.produk) ? item.produk[0] : item.produk;
    const e = Array.isArray(item.equipment) ? item.equipment[0] : item.equipment;
    
    const isProduk = !!item.produk_id;
    const detail = isProduk ? p : e;
    
    const umkm = umkmMap[detail?.user_id] || { id: 0, nama_usaha: 'UMKM Tidak Ditemukan' };

    return {
      id: item.id,
      kuantitas: item.kuantitas,
      type: isProduk ? 'produk' : 'equipment',
      item_id: isProduk ? item.produk_id : item.equipment_id,
      nama: detail?.nama || 'Item tidak tersedia',
      harga: isProduk ? detail?.harga : detail?.harga_sewa,
      gambar_url: detail?.gambar_url,
      umkm_id: umkm.id,
      umkm_nama: umkm.nama_usaha
    };
  });

  return <CartClient initialItems={formattedCartItems as any[]} />;
}
