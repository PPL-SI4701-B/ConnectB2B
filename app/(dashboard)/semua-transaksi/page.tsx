import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import NotificationBell from '@/components/layout/NotificationBell';
import {
  ArrowRightLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  CheckCheck,
  ShoppingBag,
} from 'lucide-react';

export const metadata = {
  title: 'Semua Aktivitas Transaksi | ConnectB2B',
  description: 'Pantau seluruh aktivitas transaksi yang terjadi di platform ConnectB2B.',
};

export const dynamic = 'force-dynamic';

function getStatusConfig(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'selesai' || s === 'completed') {
    return { label: 'Selesai', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: <CheckCheck className="w-3 h-3" /> };
  }
  if (s === 'lunas') {
    return { label: 'Lunas / Aktif', bg: 'bg-teal-50', text: 'text-teal-600', icon: <CheckCircle className="w-3 h-3" /> };
  }
  if (s === 'belum lunas') {
    return { label: 'Menunggu Pembayaran', bg: 'bg-amber-50', text: 'text-amber-600', icon: <Clock className="w-3 h-3" /> };
  }
  if (s === 'dalam pengiriman' || s === 'dikirim') {
    return { label: 'Dalam Pengiriman', bg: 'bg-blue-50', text: 'text-blue-600', icon: <ShoppingBag className="w-3 h-3" /> };
  }
  return { label: status || 'Diproses', bg: 'bg-slate-50', text: 'text-slate-600', icon: <AlertCircle className="w-3 h-3" /> };
}

export default async function SemuaTransaksiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Ambil role user
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as any;

  const role = (userRow?.role || '').toLowerCase();
  if (role === 'admin') redirect('/admin');

  // Ambil nama display user
  let displayName = 'Pengguna';
  let isIndustri = role === 'industri';
  if (isIndustri) {
    const { data: ind } = await supabase.from('industri').select('nama_perusahaan').eq('user_id', user.id).single();
    displayName = (ind as any)?.nama_perusahaan || displayName;
  } else {
    const { data: umkm } = await supabase.from('umkm').select('nama_usaha').eq('user_id', user.id).single();
    displayName = (umkm as any)?.nama_usaha || displayName;
  }

  // Fetch semua transaksi dari seluruh UMKM (data publik)
  const { data: transaksiRaw } = await supabase
    .from('transaksi')
    .select(`
      id,
      tanggal_mulai,
      tanggal_selesai,
      status,
      progress_status,
      request (
        id,
        pesan,
        umkm_id,
        industri_id,
        umkm!request_umkm_id_fkey ( id, nama_usaha ),
        industri!request_industri_id_fkey ( id, nama_perusahaan )
      )
    `)
    .order('tanggal_mulai', { ascending: false })
    .order('id', { ascending: false })
    .limit(200);

  const transaksiList = (transaksiRaw as any[]) ?? [];

  // Hitung ringkasan
  const totalTrx = transaksiList.length;
  const totalSelesai = transaksiList.filter(t => t.tanggal_selesai).length;
  const totalAktif = transaksiList.filter(t => !t.tanggal_selesai && t.status === 'lunas').length;
  const totalMenunggu = transaksiList.filter(t => t.status === 'belum lunas').length;

  const rows = transaksiList.map((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    const umkm = Array.isArray(req?.umkm) ? req.umkm[0] : req?.umkm;
    const industri = Array.isArray(req?.industri) ? req.industri[0] : req?.industri;
    return {
      trxId: t.id,
      trxCode: `#TRX-${String(t.id).padStart(4, '0')}`,
      reqCode: `#REQ-${String(req?.id ?? 0).padStart(4, '0')}`,
      umkmNama: umkm?.nama_usaha || 'UMKM Tidak Diketahui',
      industriNama: industri?.nama_perusahaan || 'Industri Tidak Diketahui',
      pesan: req?.pesan || '-',
      tanggalMulai: t.tanggal_mulai,
      tanggalSelesai: t.tanggal_selesai,
      status: t.status || 'belum lunas',
    };
  });

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="w-full bg-bg-color min-h-screen">
      <div className="p-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <div className="text-[14px] font-medium text-text-muted mb-1">
              Halaman / Semua Aktivitas Transaksi
            </div>
            <h1 className="text-[32px] font-bold text-text-main">Aktivitas Pasar</h1>
            <p className="text-text-muted text-[15px] mt-1">
              Seluruh transaksi yang sedang berjalan dan telah selesai di platform ConnectB2B.
            </p>
          </div>
          <div className="flex items-center gap-5 bg-card-bg px-5 py-2.5 rounded-[30px] shadow-sm">
            <NotificationBell />
            <div className={`w-10 h-10 rounded-full ${isIndustri ? 'bg-secondary' : 'bg-primary'} text-white flex items-center justify-center font-bold border-2 border-white shadow-sm`}>
              {displayName.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-card-bg rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-[#ede7ff] text-primary flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <span className="text-text-muted text-[13px] font-medium">Total Transaksi</span>
            </div>
            <p className="text-[28px] font-bold text-text-main leading-none">{totalTrx}</p>
          </div>
          <div className="bg-card-bg rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-[#e6f9f4] text-success flex items-center justify-center">
                <CheckCheck className="w-4 h-4" />
              </div>
              <span className="text-text-muted text-[13px] font-medium">Selesai</span>
            </div>
            <p className="text-[28px] font-bold text-text-main leading-none">{totalSelesai}</p>
          </div>
          <div className="bg-card-bg rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-[#e0f2fe] text-blue-500 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-text-muted text-[13px] font-medium">Aktif</span>
            </div>
            <p className="text-[28px] font-bold text-text-main leading-none">{totalAktif}</p>
          </div>
          <div className="bg-card-bg rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-[#fffbdf] text-warning flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-text-muted text-[13px] font-medium">Menunggu Bayar</span>
            </div>
            <p className="text-[28px] font-bold text-text-main leading-none">{totalMenunggu}</p>
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-card-bg rounded-xl shadow-sm p-[30px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[20px] font-bold text-text-main">
              Semua Transaksi
              <span className="ml-2 text-[14px] font-semibold text-text-muted bg-bg-color px-3 py-1 rounded-full">
                {totalTrx} transaksi
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">#TRX</th>
                  <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">#REQ</th>
                  <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">UMKM Mitra</th>
                  <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">Industri</th>
                  <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">Jenis Kerja Sama</th>
                  <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">Mulai</th>
                  <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? rows.map((row) => {
                  const cfg = getStatusConfig(row.tanggalSelesai ? 'selesai' : row.status);
                  return (
                    <tr key={row.trxId} className="hover:bg-[#f8fafc] transition-colors group">
                      <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                        <span className="font-bold text-primary text-[14px]">{row.trxCode}</span>
                      </td>
                      <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                        <span className="text-text-muted text-[13px] font-medium">{row.reqCode}</span>
                      </td>
                      <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-bg-color text-primary font-bold text-[12px] flex items-center justify-center shrink-0">
                            {row.umkmNama.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[14px] text-text-main">{row.umkmNama}</span>
                        </div>
                      </td>
                      <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                        <span className="text-[14px] text-text-main font-medium">{row.industriNama}</span>
                      </td>
                      <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                        <span className="text-[14px] text-text-muted truncate block max-w-[180px]">{row.pesan}</span>
                      </td>
                      <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                        <span className="text-[13px] text-text-muted">{formatDate(row.tanggalMulai)}</span>
                      </td>
                      <td className="py-4 border-b border-border-color group-last:border-none">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted text-[15px]">
                      Belum ada transaksi di platform.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
