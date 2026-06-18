import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import ProductDetailActions from './ProductDetailActions';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('produk')
    .select('nama, deskripsi')
    .eq('id', parseInt(id, 10))
    .single();

  if (!product) {
    return {
      title: 'Produk Tidak Ditemukan - ConnectB2B',
    };
  }

  return {
    title: `${product.nama} | Katalog Publik - ConnectB2B`,
    description: product.deskripsi || 'Detail produk dari katalog publik ConnectB2B.',
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch product
  const { data: product, error: productError } = await supabase
    .from('produk')
    .select('*')
    .eq('id', parseInt(id, 10))
    .single();

  if (productError || !product) {
    notFound();
  }

  // Fetch UMKM info
  const { data: umkm } = await supabase
    .from('umkm')
    .select('id, nama_usaha, deskripsi, alamat')
    .eq('user_id', product.user_id)
    .single();

  // Fetch rating for this UMKM
  let umkmRating: { avg_rating: number; total_ulasan: number } | null = null;
  if (umkm?.id) {
    const { data: ratingRow } = await (supabase as any)
      .from('umkm_rating_summary')
      .select('avg_rating, total_ulasan')
      .eq('umkm_id', umkm.id)
      .maybeSingle();
    if (ratingRow) {
      umkmRating = { avg_rating: parseFloat(ratingRow.avg_rating), total_ulasan: parseInt(ratingRow.total_ulasan) };
    }
  }

  // Check if logged-in user is industri (only industri can add to cart)
  const { data: { user } } = await supabase.auth.getUser();
  let isIndustri = false;
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    isIndustri = userData?.role === 'industri';
  }

  const formatRupiah = (angka: number | null) => {
    if (!angka) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex mb-8 text-sm font-medium text-slate-500">
        <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/katalog-publik" className="hover:text-blue-600 transition-colors">Katalog Publik</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900 truncate max-w-xs">{product.nama}</span>
      </nav>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-0 md:gap-8">
          
          {/* Product Image Section */}
          <div className="lg:col-span-5 bg-slate-50 relative min-h-[300px] md:min-h-[500px]">
            {product.gambar_url ? (
              <img 
                src={product.gambar_url} 
                alt={product.nama}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 p-8">
                <svg className="w-24 h-24 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Tidak ada gambar</span>
              </div>
            )}
            
            {product.kategori && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1.5 text-xs font-semibold bg-white/90 backdrop-blur-md text-blue-700 rounded-full shadow-sm border border-white/20">
                  {product.kategori}
                </span>
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="lg:col-span-7 p-6 md:p-8 lg:p-10 flex flex-col">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 leading-tight">
              {product.nama}
            </h1>
            
            <div className="text-3xl font-extrabold text-blue-600 mb-6">
              {formatRupiah(product.harga)}
            </div>

            <div className="prose prose-slate max-w-none mb-8">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Deskripsi Produk</h3>
              <p className="text-slate-600 leading-relaxed">
                {product.deskripsi || 'Tidak ada deskripsi yang tersedia untuk produk ini.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Kapasitas / Stok</span>
                <span className="text-lg font-semibold text-slate-900">{product.stok || 'Tidak Terbatas'}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Kategori</span>
                <span className="text-lg font-semibold text-slate-900">{product.kategori || '-'}</span>
              </div>
            </div>

            {/* UMKM Info */}
            <div className="mt-auto">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Informasi Pemilik</h3>
              
              {umkmRating ? (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(star => (
                      <svg key={star} className={`w-4 h-4 ${star <= Math.round(umkmRating!.avg_rating) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{umkmRating.avg_rating.toFixed(1)}</span>
                  <span className="text-sm text-slate-400">({umkmRating.total_ulasan} ulasan)</span>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mb-4">Belum ada ulasan untuk UMKM ini.</p>
              )}

              <Link href={`/profil`} className="group flex items-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all duration-300 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-inner">
                  {umkm?.nama_usaha?.charAt(0) || 'U'}
                </div>
                <div className="ml-4 flex-grow">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {umkm?.nama_usaha || 'UMKM Tidak Diketahui'}
                  </h4>
                  <p className="text-sm text-slate-500 line-clamp-1">
                    {umkm?.deskripsi || umkm?.alamat || 'Klik untuk melihat profil UMKM'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {isIndustri && umkm ? (
                <ProductDetailActions produkId={product.id} umkmId={umkm.id} minPemesanan={product.min_pembelian || 1} />
              ) : !user ? (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  Login untuk Ajukan Kerjasama
                </Link>
              ) : (
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 text-slate-500 text-sm rounded-xl text-center">
                  Hanya akun Industri yang dapat mengajukan kerjasama.
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
