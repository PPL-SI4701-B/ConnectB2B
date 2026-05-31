import { createClient } from '@/lib/supabase-server';
import LaporanList from '@/components/admin/LaporanList';
import { AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export const revalidate = 0; // ensure fresh data on load

export default async function TinjauanKontenPage() {
  const supabase = await createClient();

  // Fetch pending reports
  const { data: laporanData, error } = await supabase
    .from('laporan_konten')
    .select(`
      id,
      katalog_id,
      pelapor,
      alasan,
      severity,
      status,
      katalog_type,
      produk:katalog_id (
        nama,
        deskripsi,
        gambar_url,
        user_id,
        users (
          umkm (
            nama_usaha
          )
        )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching laporan_konten:', error);
  }

  // Format the data to match LaporanItem type for the client component
  const formattedData = (laporanData || []).map((item: any) => {
    // If it's a produk, extract UMKM name
    const umkmName = item.produk?.users?.umkm?.[0]?.nama_usaha || item.produk?.users?.umkm?.nama_usaha;
    
    return {
      id: item.id,
      katalog_id: item.katalog_id,
      pelapor: item.pelapor,
      alasan: item.alasan,
      severity: item.severity,
      status: item.status,
      produk: item.produk ? {
        nama: item.produk.nama,
        deskripsi: item.produk.deskripsi,
        gambar_url: item.produk.gambar_url,
        user_id: item.produk.user_id,
        umkm: umkmName ? { nama_usaha: umkmName } : null
      } : null
    };
  });

  return (
    <>
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500 mb-1">Halaman / Tinjauan Konten Katalog</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Moderasi & Pengelolaan Konten (FR-22)</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <button className="text-amber-500 hover:text-amber-600 transition-colors">
            <AlertTriangle className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-200"></div>
          <span className="font-bold text-sm text-slate-700">SuperAdmin</span>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 relative">
            <Image 
              src="https://ui-avatars.com/api/?name=Super+Admin&background=ee5d50&color=fff" 
              alt="Profile" 
              fill
              className="object-cover"
            />
          </div>
        </div>
      </header>

      {/* Content Container */}
      <LaporanList laporanData={formattedData} />
    </>
  );
}
