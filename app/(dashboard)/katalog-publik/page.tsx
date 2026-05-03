import { createClient } from '@/lib/supabase-server';
import KatalogClient from './KatalogClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Katalog Publik - ConnectB2B',
  description: 'Jelajahi produk dan jasa unggulan dari berbagai UMKM di ConnectB2B.',
};

export const revalidate = 0; // Disable caching for now to always show latest data

export default async function KatalogPublikPage() {
  const supabase = await createClient();

  // Fetch all products
  const { data: productsData, error: productsError } = await supabase
    .from('produk')
    .select('*')
    .order('id', { ascending: false });

  // Fetch all categories
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('kategori')
    .select('*')
    .order('nama_kategori', { ascending: true });

  // Fetch UMKM data for the products to get nama_usaha
  // We extract unique user_ids from products
  const userIds = productsData ? Array.from(new Set(productsData.map(p => p.user_id))) : [];
  
  let umkmDataMap: Record<string, { nama_usaha: string }> = {};
  
  if (userIds.length > 0) {
    const { data: umkmData } = await supabase
      .from('umkm')
      .select('user_id, nama_usaha')
      .in('user_id', userIds);
      
    if (umkmData) {
      umkmData.forEach(umkm => {
        umkmDataMap[umkm.user_id] = { nama_usaha: umkm.nama_usaha };
      });
    }
  }

  // Map products to include umkm info
  const initialProducts = (productsData || []).map(product => ({
    ...product,
    umkm: umkmDataMap[product.user_id] || null
  }));

  const categories = categoriesData || [];

  return (
    <KatalogClient 
      initialProducts={initialProducts} 
      categories={categories} 
    />
  );
}
