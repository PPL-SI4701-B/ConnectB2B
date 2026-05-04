import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { 
  Building2, Store, Package, Star, ArrowRight,
  ShieldCheck, Search, Handshake, MapPin
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const supabase = await createClient();

  // Fetch semua data secara paralel
  const [
    { count: jumlahUMKM },
    { count: jumlahIndustri },
    { count: jumlahProduk },
    { data: produkUnggulan },
    { data: umkmTerpercaya },
    { data: ratingData }
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true })
      .eq('role', 'umkm').eq('status_verifikasi', 'terverifikasi'),
    supabase.from('users').select('*', { count: 'exact', head: true })
      .eq('role', 'industri').eq('status_verifikasi', 'terverifikasi'),
    // We join users to ensure the products belong to verified users
    supabase.from('produk').select('id, users!inner(status_verifikasi)', { count: 'exact', head: true })
      .eq('users.status_verifikasi', 'terverifikasi'),
    supabase.from('produk').select('id, nama, harga, gambar_url, kategori, users!inner(nama, status_verifikasi)')
      .eq('users.status_verifikasi', 'terverifikasi')
      .order('id', { ascending: false }).limit(4),
    supabase.from('umkm').select('id, nama_usaha, alamat, kategori(nama_kategori), users!inner(status_verifikasi)')
      .eq('users.status_verifikasi', 'terverifikasi')
      .limit(3),
    supabase.from('ulasan').select('rating')
  ]);

  const avgRating = ratingData && ratingData.length > 0
    ? (ratingData.reduce((sum, u) => sum + u.rating, 0) / ratingData.length).toFixed(1)
    : '0';

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };



  return (
    <div className="min-h-screen bg-[#FAFBFF] text-slate-800 font-sans selection:bg-blue-500/30">
      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                C
              </div>
              <span className="text-2xl font-extrabold text-[#1E3A5F] tracking-tight">ConnectB2B</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-blue-600 font-semibold transition-colors">Beranda</Link>
              <Link href="/pencarian" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Produk</Link>
              <Link href="#" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">Tentang</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden sm:inline-flex px-5 py-2.5 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors">
                Masuk
              </Link>
              <Link href="/register" className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all">
                Daftar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white -z-10"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#1E3A5F] tracking-tight mb-6 leading-tight">
            Hubungkan Bisnis <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Anda</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Platform digital terintegrasi untuk menyatukan UMKM dan Industri. Temukan mitra terbaik, jalin kerja sama, dan tingkatkan skala bisnis Anda sekarang.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <Link href="/register?role=umkm" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              Daftar sebagai UMKM <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/register?role=industri" className="px-8 py-4 bg-white border border-slate-200 text-[#1E3A5F] font-bold rounded-2xl shadow-sm hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center">
              Daftar sebagai Industri
            </Link>
          </div>

          {/* Stats Real */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-extrabold text-[#1E3A5F] mb-1">{jumlahUMKM || 0}+</h3>
              <p className="text-sm font-medium text-slate-500">UMKM Aktif</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-extrabold text-[#1E3A5F] mb-1">{jumlahIndustri || 0}+</h3>
              <p className="text-sm font-medium text-slate-500">Mitra Industri</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-extrabold text-[#1E3A5F] mb-1">{jumlahProduk || 0}+</h3>
              <p className="text-sm font-medium text-slate-500">Produk Tersedia</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-extrabold text-[#1E3A5F] mb-1">{avgRating}/5</h3>
              <p className="text-sm font-medium text-slate-500">Rating Platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION PRODUK UNGGULAN */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-extrabold text-[#1E3A5F] mb-2">Produk Unggulan</h2>
              <p className="text-slate-500 font-medium">Temukan produk terbaik dari UMKM terverifikasi</p>
            </div>
            <Link href="/login" className="hidden sm:inline-flex text-blue-600 font-semibold hover:text-blue-700 items-center gap-1">
              Lihat Semua Produk <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {produkUnggulan && produkUnggulan.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {produkUnggulan.map((produk: any) => (
                <div key={produk.id} className="group border border-slate-100 rounded-3xl overflow-hidden bg-white hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    {produk.gambar_url ? (
                      <img src={produk.gambar_url} alt={produk.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 font-bold text-2xl">
                        {produk.nama.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md mb-2 inline-block">
                      {produk.kategori || 'Umum'}
                    </span>
                    <h3 className="font-bold text-[#1E3A5F] text-lg mb-1 truncate">{produk.nama}</h3>
                    <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1">
                      <Store className="w-3 h-3" /> {produk.users?.nama || 'UMKM Mitra'}
                    </p>
                    <div className="text-lg font-extrabold text-[#1E3A5F]">
                      {formatIDR(produk.harga)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Belum ada produk tersedia</p>
            </div>
          )}
          
          <div className="mt-8 text-center sm:hidden">
            <Link href="/login" className="inline-flex text-blue-600 font-semibold items-center gap-1">
              Lihat Semua Produk <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. SECTION UMKM TERPERCAYA */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#1E3A5F] mb-4">UMKM Terpercaya Kami</h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto">Bermitra dengan UMKM terbaik yang telah melewati proses verifikasi ketat untuk menjamin kualitas dan keamanan kerja sama.</p>
          </div>

          {umkmTerpercaya && umkmTerpercaya.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {umkmTerpercaya.map((umkm: any) => (
                <div key={umkm.id} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-lg border border-slate-100 transition-shadow">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-inner">
                      {umkm.nama_usaha?.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="flex items-center text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Terverifikasi
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">{umkm.nama_usaha}</h3>
                  <div className="flex items-center text-xs font-medium text-slate-500 mb-4 gap-4">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {umkm.alamat || 'Indonesia'}</span>
                    <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {umkm.kategori?.nama_kategori || 'Umum'}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {umkm.deskripsi ? (umkm.deskripsi.length > 100 ? `${umkm.deskripsi.substring(0, 100)}...` : umkm.deskripsi) : 'UMKM unggulan terverifikasi yang siap memenuhi kebutuhan produksi industri Anda dengan standar terbaik.'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-100">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Belum ada UMKM terdaftar</p>
            </div>
          )}
        </div>
      </section>



      {/* 6. SECTION HOW IT WORKS */}
      <section className="py-24 bg-[#1E3A5F] text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Cara Kerja ConnectB2B</h2>
            <p className="text-blue-200 max-w-2xl mx-auto font-medium">Tiga langkah mudah untuk memulai kolaborasi bisnis yang saling menguntungkan.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-blue-800 -z-10"></div>
            
            <div className="text-center relative">
              <div className="w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-[#1E3A5F]">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Daftar & Verifikasi</h3>
              <p className="text-blue-200 text-sm leading-relaxed max-w-xs mx-auto">Buat akun sebagai UMKM atau Industri. Lengkapi profil dan tunggu proses verifikasi tim kami.</p>
            </div>
            
            <div className="text-center relative">
              <div className="w-24 h-24 mx-auto bg-cyan-500 rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-[#1E3A5F]">
                <Search className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Temukan Mitra</h3>
              <p className="text-blue-200 text-sm leading-relaxed max-w-xs mx-auto">Jelajahi katalog produk, cari spesifikasi yang dibutuhkan, atau ajukan request penawaran.</p>
            </div>
            
            <div className="text-center relative">
              <div className="w-24 h-24 mx-auto bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-[#1E3A5F]">
                <Handshake className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Kerja Sama</h3>
              <p className="text-blue-200 text-sm leading-relaxed max-w-xs mx-auto">Lakukan negosiasi, setujui kontrak kerja sama, dan pantau progres produksi hingga selesai.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION CTA BOTTOM */}
      <section className="py-20 bg-gradient-to-b from-[#1E3A5F] to-[#0f2139] text-center border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-extrabold text-white mb-6">Siap Bersinergi dan Tumbuh Bersama?</h2>
          <p className="text-xl text-blue-200 mb-10">Bergabunglah dengan ribuan bisnis lainnya yang telah mempercepat pertumbuhan mereka melalui ConnectB2B.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register?role=umkm" className="px-8 py-4 bg-white text-[#1E3A5F] font-bold rounded-2xl shadow-xl hover:-translate-y-1 transition-all">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-[#0a1526] py-12 text-center text-slate-400 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold text-2xl mx-auto mb-6">
            C
          </div>
          <p className="font-medium">© 2026 ConnectB2B — Kelompok B PPL</p>
          <p className="text-sm mt-2 text-slate-500">Membangun ekosistem bisnis yang lebih baik untuk Indonesia.</p>
        </div>
      </footer>
    </div>
  );
}
