import { createClient } from '@/lib/supabase-server';
import VerificationTable from '@/components/admin/VerificationTable';
import ModerationQueuePreview from '@/components/admin/ModerationQueuePreview';
import Link from 'next/link';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Factory,
  ArrowRight,
  Users
} from 'lucide-react';

export const revalidate = 0; // ensure fresh data on load

export default async function AdminPage() {
  const supabase = await createClient();

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

  // Fetch moderation queue
  const { data: laporanKonten, error: laporanError } = await supabase
    .from('laporan_konten')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (laporanError) {
    // console.error('Error fetching laporan_konten:', laporanError);
  }

  // Fetch active industries this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: trxThisMonth } = await supabase
    .from('transaksi')
    .select('request:request_id(industri_id)')
    .gte('created_at', startOfMonth);

  let industriAktif = 0;
  if (trxThisMonth) {
    const activeSet = new Set(
      trxThisMonth
        .map((t: any) => t.request?.industri_id)
        .filter((id: any) => id != null)
    );
    industriAktif = activeSet.size;
  }

  // Fetch stat counts
  const [
    { count: totalTransaksi },
    { count: penggunaTervalidasi },
  ] = await Promise.all([
    supabase.from('transaksi').select('*', { count: 'exact', head: true }).eq('status', 'lunas'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status_verifikasi', 'terverifikasi'),
  ]);

  const moderationQueueCount = laporanKonten?.length || 0;
  const pendingUsersCount = documents ? new Set(documents.map((d: any) => d.user_id)).size : 0;

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
                Menunggu: <span className="font-bold text-amber-500">{pendingUsersCount}</span>
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
              <span className="text-3xl font-bold text-slate-900">{moderationQueueCount}</span>
              <span className="text-xs font-medium text-slate-500">Dalam antrean</span>
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
                Aktif
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section Kiri: Verifikasi Dokumen */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900">Antrean Verifikasi Akun Baru</h2>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                {pendingUsersCount} Menunggu
              </span>
            </div>
            <Link href="/admin/users" className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors">
              <Users className="w-4 h-4 mr-2" />
              Kelola Pengguna
            </Link>
          </div>
          
          {documents && <VerificationTable documents={documents} />}

          {/* Placeholder FR-29 */}
          <div className="mt-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Antrean Validasi Pembayaran Escrow</h3>
            <p className="text-slate-500 text-sm mb-4">Pemantauan dan validasi pembayaran proyek dikelola di modul terpisah (FR-29).</p>
            <Link href="/admin/pembayaran" className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-700">
              Buka Panel Validasi Pembayaran <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Section Kanan: Moderasi Katalog */}
        <div className="lg:col-span-1">
          <ModerationQueuePreview laporanList={laporanKonten || []} />
        </div>
      </div>
    </>
  );
}
