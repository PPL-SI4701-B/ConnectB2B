import { createClient } from '@/lib/supabase-server';
import LaporanList from '@/components/admin/LaporanList';
import { AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export const revalidate = 0; // ensure fresh data on load

export default async function TinjauanKontenPage() {
  const supabase = await createClient();

  // Fetch pending reports.
  // Catatan: laporan_konten.katalog_id BUKAN foreign key (bisa menunjuk produk ATAU equipment,
  // dibedakan oleh katalog_type), jadi embedding PostgREST `produk:katalog_id(...)` gagal
  // dengan error kosong `{}`. Kita resolve katalog secara manual sesuai tipenya.
  const { data: laporanData, error } = await supabase
    .from('laporan_konten')
    .select('id, katalog_id, pelapor, alasan, severity, status, katalog_type, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching laporan_konten:', error);
  }

  const reports = (laporanData as any[]) || [];

  const produkIds = reports.filter((r) => r.katalog_type === 'produk').map((r) => r.katalog_id);
  const equipmentIds = reports.filter((r) => r.katalog_type === 'equipment').map((r) => r.katalog_id);

  const produkMap: Record<number, any> = {};
  const equipmentMap: Record<number, any> = {};

  if (produkIds.length > 0) {
    const { data } = await supabase
      .from('produk')
      .select('id, nama, deskripsi, gambar_url, user_id')
      .in('id', produkIds);
    (data as any[] || []).forEach((p) => { produkMap[p.id] = p; });
  }

  if (equipmentIds.length > 0) {
    const { data } = await supabase
      .from('equipment')
      .select('id, nama, deskripsi, gambar_url, user_id')
      .in('id', equipmentIds);
    (data as any[] || []).forEach((e) => { equipmentMap[e.id] = e; });
  }

  // Resolve nama UMKM pemilik via user_id (satu query)
  const ownerUserIds = Array.from(
    new Set(
      [
        ...Object.values(produkMap).map((p: any) => p.user_id),
        ...Object.values(equipmentMap).map((e: any) => e.user_id),
      ].filter(Boolean)
    )
  );
  const umkmNameByUser: Record<string, string> = {};
  if (ownerUserIds.length > 0) {
    const { data } = await supabase
      .from('umkm')
      .select('user_id, nama_usaha')
      .in('user_id', ownerUserIds as string[]);
    (data as any[] || []).forEach((u) => { umkmNameByUser[u.user_id] = u.nama_usaha; });
  }

  // Format the data to match LaporanItem type for the client component
  const formattedData = reports.map((item: any) => {
    const src = item.katalog_type === 'produk' ? produkMap[item.katalog_id] : equipmentMap[item.katalog_id];
    const umkmName = src ? umkmNameByUser[src.user_id] : null;

    return {
      id: item.id,
      katalog_id: item.katalog_id,
      pelapor: item.pelapor,
      alasan: item.alasan,
      severity: item.severity,
      status: item.status,
      produk: src ? {
        nama: src.nama,
        deskripsi: src.deskripsi,
        gambar_url: src.gambar_url,
        user_id: src.user_id,
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
            <img 
              src="https://ui-avatars.com/api/?name=Super+Admin&background=ee5d50&color=fff" 
              alt="Profile" 
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </header>

      {/* Content Container */}
      <LaporanList laporanData={formattedData} />
    </>
  );
}
