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

  // Fetch all active products
  const { data: productsData, error: productsError } = await supabase
    .from('produk')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: false });

  // Fetch all categories
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('kategori')
    .select('*')
    .order('nama_kategori', { ascending: true });

  // Fetch UMKM data for the products to get nama_usaha + id
  const userIds = productsData ? Array.from(new Set(productsData.map(p => p.user_id))) : [];

  let umkmDataMap: Record<string, { id: number; nama_usaha: string }> = {};
  let umkmIds: number[] = [];

  if (userIds.length > 0) {
    const { data: umkmData } = await supabase
      .from('umkm')
      .select('id, user_id, nama_usaha')
      .in('user_id', userIds);

    if (umkmData) {
      umkmData.forEach(umkm => {
        umkmDataMap[umkm.user_id] = { id: umkm.id, nama_usaha: umkm.nama_usaha };
      });
      umkmIds = umkmData.map(u => u.id);
    }
  }

  // Fetch rating aggregates per umkm
  let ratingMap: Record<number, { avg_rating: number; total_ulasan: number }> = {};
  if (umkmIds.length > 0) {
    const { data: ratingData } = await supabase
      .from('umkm_rating_summary' as any)
      .select('umkm_id, avg_rating, total_ulasan')
      .in('umkm_id', umkmIds);
    if (ratingData) {
      (ratingData as any[]).forEach((r: any) => {
        ratingMap[r.umkm_id] = { avg_rating: parseFloat(r.avg_rating), total_ulasan: parseInt(r.total_ulasan) };
      });
    }
  }

  // Map products to include umkm info + rating
  const initialProducts = (productsData || []).map(product => {
    const umkm = umkmDataMap[product.user_id] || null;
    const rating = umkm ? (ratingMap[umkm.id] || null) : null;
    return {
      ...product,
      umkm: umkm ? { nama_usaha: umkm.nama_usaha, avg_rating: rating?.avg_rating ?? null, total_ulasan: rating?.total_ulasan ?? 0 } : null,
    };
  });

  const categories = categoriesData || [];

  return (
    <KatalogClient 
      initialProducts={initialProducts} 
      categories={categories} 
    />
  );
}
