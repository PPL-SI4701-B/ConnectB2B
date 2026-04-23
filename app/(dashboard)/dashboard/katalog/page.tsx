import { createClient } from '@/lib/supabase-server';
import CatalogClient from './CatalogClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = {
  title: 'Katalog & Aset | ConnectB2B',
};

export default async function KatalogPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8 text-black bg-white rounded-xl">Debug: User session not found. Please log in. <Link href="/login" className="text-blue-600 underline">Go to Login</Link></div>;
  }

  // Ambil profil_user untuk status_verifikasi
  const { data: userData } = await supabase
    .from('users')
    .select('status_verifikasi')
    .eq('id', user.id)
    .single();

  const statusVerifikasi = userData?.status_verifikasi || 'menunggu';

  // Ambil list produk
  const { data: produkList } = await supabase
    .from('produk')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  // Ambil list equipment (Alat/Mesin Produksi)
  const { data: equipmentList } = await supabase
    .from('equipment')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  return (
    <CatalogClient 
      produkList={produkList || []} 
      equipmentList={equipmentList || []} 
      statusVerifikasi={statusVerifikasi} 
    />
  );
}
