import { createClient } from '@/lib/supabase-server';
import VerificationTable from '@/components/admin/VerificationTable';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Factory
} from 'lucide-react';

export const revalidate = 0; // ensure fresh data on load

export default async function AdminPage() {
  const supabase = createClient();

  // Fetch pending review documents
  const { data: documents, error } = await supabase
    .from('dokumen_legalitas')
    .select(`
      *,
      users (
        nama,
        role,
        umkm (
          nama_usaha
        ),
        industri (
          nama_perusahaan
        )
      )
    `)
    .eq('status_verifikasi', 'menunggu')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
  }

  // Fetch stat counts
  const [
    { count: totalTransaksi },
    { count: penggunaTervalidasi },
    { count: industriAktif }
  ] = await Promise.all([
    // @ts-ignore
    supabase.from('transaksi').select('*', { count: 'exact', head: true }).eq('status', 'lunas'),
    // @ts-ignore
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status_verifikasi', 'terverifikasi'),
    // @ts-ignore
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'industri').eq('status_verifikasi', 'terverifikasi')
  ]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Monitoring Platform Utama</h1>
        <p className="text-slate-500 mt-2 text-sm">Pratinjau metrik transaksi, verifikasi pengguna, dan pemantauan sistem.</p>
      </div>

      {/* Stat Cards - using glassmorphism and subtle gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 flex-wrap xl:grid-cols-4 gap-6 mb-10">

        {/* Card 1 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">Total Transaksi Sukses</h3>
              <div className="p-2 bg-emerald-100/50 rounded-xl">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{totalTransaksi || 0}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center">
                +12% <span className="ml-1 text-slate-400 font-medium">bln ini</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">Pengguna Tervalidasi</h3>
              <div className="p-2 bg-blue-100/50 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{penggunaTervalidasi || 0}</span>
              <span className="text-xs font-medium text-slate-500">
                Menunggu: <span className="font-bold text-amber-500">{documents?.length || 0}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">Laporan Pelanggaran Konten</h3>
              <div className="p-2 bg-red-100/50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">12</span>
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                -3 <span className="font-medium text-slate-400">dr sblm</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">Industri Aktif (Bulan Ini)</h3>
              <div className="p-2 bg-indigo-100/50 rounded-xl">
                <Factory className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{industriAktif || 0}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                +45
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Antrean Verifikasi Dokumen Akun Baru</h2>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
          {documents?.length || 0} Menunggu
        </span>
      </div>

      {documents && <VerificationTable documents={documents} />}
    </>
  );
}
