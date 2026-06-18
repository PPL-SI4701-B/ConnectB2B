import { createClient } from '@/lib/supabase-server';
import VerificationTable from '@/components/admin/VerificationTable';
import PaymentValidationTable from '@/components/admin/PaymentValidationTable';
import UserManagementTable from '@/components/admin/UserManagementTable';
import ContentModerationTable from '@/components/admin/ContentModerationTable';
import UmkmPayoutTable, { PayoutItem } from '@/components/admin/UmkmPayoutTable';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Factory,
  Users,
  Package,
  Banknote
} from 'lucide-react';

export const revalidate = 0;

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

  // Fetch pending payments (FR-29)
  const { data: pendingPayments, error: paymentError } = await supabase
    .from('pembayaran')
    .select(`
      id,
      transaksi_id,
      tanggal_bayar,
      bukti_transfer,
      jumlah_transfer,
      status,
      transaksi (
        id,
        request:request_id (
          industri:industri_id (
            nama_perusahaan,
            user_id
          ),
          umkm:umkm_id (
            user_id
          )
        ),
        detail_transaksi (
          subtotal
        )
      )
    `)
    .eq('status', 'pending')
    .order('tanggal_bayar', { ascending: false });

  if (paymentError) {
    console.error('Error fetching pending payments:', paymentError);
  }

  // Fetch transaksi yang siap dicairkan ke UMKM:
  // Syarat: Industri sudah konfirmasi selesai (tanggal_selesai NOT NULL) DAN ada pembayaran berhasil
  const { data: payoutRaw } = await supabase
    .from('transaksi')
    .select(`
      id,
      tanggal_selesai,
      bukti_pengiriman_umkm,
      pembayaran (
        id,
        tanggal_bayar,
        bukti_pengiriman,
        bukti_pembayaran_umkm,
        status_pencairan,
        status
      ),
      request:request_id (
        industri:industri_id ( nama_perusahaan ),
        umkm:umkm_id ( nama_usaha, no_rekening, nama_bank, atas_nama_rekening )
      )
    `)
    .not('tanggal_selesai', 'is', null)
    .order('tanggal_selesai', { ascending: false }) as any;

  const payouts: PayoutItem[] = (payoutRaw as any[] || [])
    .filter((t: any) => {
      const pembayaranArr = Array.isArray(t.pembayaran) ? t.pembayaran : t.pembayaran ? [t.pembayaran] : [];
      return pembayaranArr.some((p: any) => p.status === 'berhasil');
    })
    .map((t: any) => {
      const pembayaranArr = Array.isArray(t.pembayaran) ? t.pembayaran : t.pembayaran ? [t.pembayaran] : [];
      const p = pembayaranArr.find((p: any) => p.status === 'berhasil') ?? pembayaranArr[0] ?? {};
      const req = Array.isArray(t.request) ? t.request[0] : t.request;
      const industri = Array.isArray(req?.industri) ? req.industri[0] : req?.industri;
      const umkm = Array.isArray(req?.umkm) ? req.umkm[0] : req?.umkm;
      return {
        pembayaran_id: p.id,
        transaksi_id: t.id,
        umkm_nama: umkm?.nama_usaha || 'UMKM',
        nama_bank: umkm?.nama_bank ?? null,
        no_rekening: umkm?.no_rekening ?? null,
        atas_nama_rekening: umkm?.atas_nama_rekening ?? null,
        bukti_pengiriman: p.bukti_pengiriman ?? null,
        bukti_pembayaran_umkm: p.bukti_pembayaran_umkm ?? null,
        status_pencairan: p.status_pencairan || 'menunggu',
        tanggal_bayar: p.tanggal_bayar,
        industri_nama: industri?.nama_perusahaan || 'Industri',
      };
    });

  // Fetch only flagged products for content moderation (FR-22)
  const { data: pendingReports } = await supabase
    .from('laporan_konten')
    .select('katalog_id')
    .eq('katalog_type', 'produk')
    .eq('status', 'pending');

  const flaggedProdukIds = (pendingReports || []).map((r: any) => r.katalog_id);

  let formattedProducts: any[] = [];
  if (flaggedProdukIds.length > 0) {
    const { data: flaggedProducts } = await supabase
      .from('produk')
      .select('id, nama, kategori, harga, is_active, user_id, umkm:users!produk_user_id_fkey(nama)')
      .in('id', flaggedProdukIds)
      .order('id', { ascending: false });

    formattedProducts = (flaggedProducts as any[] || []).map((p: any) => ({
      id: p.id,
      nama: p.nama,
      kategori: p.kategori,
      harga: p.harga,
      is_active: p.is_active ?? true,
      user_id: p.user_id,
      owner_nama: Array.isArray(p.umkm) ? p.umkm[0]?.nama : p.umkm?.nama ?? null,
    }));
  }

  // Fetch all users for management table (FR-21)
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, nama, email, role, status_verifikasi, is_blocked, created_at')
    .order('created_at', { ascending: false });

  // Fetch stat counts
  const [
    { count: totalTransaksi },
    { count: penggunaTervalidasi },
    { count: industriAktif },
    { count: laporanDitolak },
  ] = await Promise.all([
    supabase.from('transaksi').select('*', { count: 'exact', head: true }).eq('status', 'lunas'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status_verifikasi', 'terverifikasi'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'industri').eq('status_verifikasi', 'terverifikasi'),
    supabase.from('dokumen_legalitas').select('*', { count: 'exact', head: true }).eq('status_verifikasi', 'ditolak'),
  ]);

  const pendingUsersCount = documents ? new Set(documents.map((d: any) => d.user_id)).size : 0;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Monitoring Platform Utama</h1>
        <p className="text-slate-500 mt-2 text-sm">Pratinjau metrik transaksi, verifikasi pengguna, dan pemantauan sistem.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 flex-wrap xl:grid-cols-4 gap-6 mb-10">
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">Total Transaksi Sukses</h3>
              <div className="p-2 bg-emerald-100/50 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{totalTransaksi || 0}</span>
              <span className="text-xs font-medium text-slate-500">transaksi lunas</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">Pengguna Tervalidasi</h3>
              <div className="p-2 bg-blue-100/50 rounded-xl"><ShieldCheck className="w-5 h-5 text-blue-600" /></div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{penggunaTervalidasi || 0}</span>
              <span className="text-xs font-medium text-slate-500">Menunggu: <span className="font-bold text-amber-500">{pendingUsersCount}</span></span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">Laporan Pelanggaran Konten</h3>
              <div className="p-2 bg-red-100/50 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{laporanDitolak || 0}</span>
              <span className="text-xs font-medium text-slate-500">Total ditolak</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500 z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">Industri Aktif (Terverifikasi)</h3>
              <div className="p-2 bg-indigo-100/50 rounded-xl"><Factory className="w-5 h-5 text-indigo-600" /></div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-slate-900">{industriAktif || 0}</span>
              <span className="text-xs font-medium text-slate-500">akun aktif</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Antrean Verifikasi Dokumen Akun Baru</h2>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">{pendingUsersCount} Menunggu</span>
      </div>

      {documents && <VerificationTable documents={documents} />}

      <div className="mt-12 mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Antrean Validasi Pembayaran Escrow</h2>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
          {pendingPayments?.length || 0} Menunggu
        </span>
      </div>

      <PaymentValidationTable payments={pendingPayments || []} />

      <div className="mt-12 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl"><Banknote className="w-5 h-5 text-blue-600" /></div>
          <h2 className="text-xl font-bold text-slate-900">Pencairan Dana ke UMKM</h2>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
          {payouts.filter(p => !p.bukti_pembayaran_umkm).length} Menunggu
        </span>
      </div>

      <UmkmPayoutTable payouts={payouts} />

      <div className="mt-12 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl"><Users className="w-5 h-5 text-slate-600" /></div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Pengguna</h2>
        </div>
        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
          {allUsers?.length || 0} Total
        </span>
      </div>

      <UserManagementTable users={(allUsers as any) || []} />

      <div className="mt-12 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl"><Package className="w-5 h-5 text-slate-600" /></div>
          <h2 className="text-xl font-bold text-slate-900">Moderasi Konten Produk</h2>
        </div>
        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
          {formattedProducts.length} Produk
        </span>
      </div>

      <ContentModerationTable products={formattedProducts} />
    </>
  );
}
