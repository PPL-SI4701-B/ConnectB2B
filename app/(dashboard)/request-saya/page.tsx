import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import NotificationBell from '@/components/layout/NotificationBell';
import RequestSayaClient from './RequestSayaClient';

export const metadata = {
  title: 'Request Saya | ConnectB2B',
  description: 'Pantau semua request kerja sama yang pernah Anda kirimkan ke mitra UMKM.',
};

export const dynamic = 'force-dynamic';

export interface RequestSayaItem {
  reqId: number;
  reqCode: string;
  umkmNama: string;
  umkmInitials: string;
  pesan: string;
  tanggalRequest: string;
  statusRequest: string;
  trxId: number | null;
  trxCode: string | null;
  statusTrx: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
}

export default async function RequestSayaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Hanya Industri yang boleh akses
  const { data: industri } = await supabase
    .from('industri')
    .select('id, nama_perusahaan')
    .eq('user_id', user.id)
    .single();

  if (!industri) redirect('/dashboard');

  const industriId = (industri as any).id;
  const industriNama: string = (industri as any).nama_perusahaan;

  // Fetch semua request yang dikirim Industri ini
  const { data: requestsRaw } = await supabase
    .from('request')
    .select(`
      id,
      pesan,
      status,
      tanggal_request,
      umkm_id,
      umkm!request_umkm_id_fkey ( id, nama_usaha )
    `)
    .eq('industri_id', industriId)
    .order('tanggal_request', { ascending: false })
    .order('id', { ascending: false });

  const requests = (requestsRaw as any[]) ?? [];

  // Fetch transaksi yang terkait dengan request-request di atas
  const requestIds = requests.map((r: any) => r.id);
  let trxMap: Record<number, { id: number; status: string; tanggal_mulai: string; tanggal_selesai: string | null }> = {};

  if (requestIds.length > 0) {
    const { data: trxRaw } = await supabase
      .from('transaksi')
      .select('id, request_id, status, tanggal_mulai, tanggal_selesai')
      .in('request_id', requestIds);

    (trxRaw as any[] || []).forEach((t: any) => {
      trxMap[t.request_id] = {
        id: t.id,
        status: t.status,
        tanggal_mulai: t.tanggal_mulai,
        tanggal_selesai: t.tanggal_selesai,
      };
    });
  }

  const items: RequestSayaItem[] = requests.map((r: any) => {
    const umkm = Array.isArray(r.umkm) ? r.umkm[0] : r.umkm;
    const umkmNama: string = umkm?.nama_usaha || 'UMKM Tidak Diketahui';
    const trx = trxMap[r.id] ?? null;

    return {
      reqId: r.id,
      reqCode: `#REQ-${String(r.id).padStart(4, '0')}`,
      umkmNama,
      umkmInitials: umkmNama.substring(0, 2).toUpperCase(),
      pesan: r.pesan || '-',
      tanggalRequest: r.tanggal_request,
      statusRequest: r.status,
      trxId: trx?.id ?? null,
      trxCode: trx ? `#TRX-${String(trx.id).padStart(4, '0')}` : null,
      statusTrx: trx?.status ?? null,
      tanggalMulai: trx?.tanggal_mulai ?? null,
      tanggalSelesai: trx?.tanggal_selesai ?? null,
    };
  });

  return (
    <div className="w-full bg-bg-color min-h-screen">
      <div className="p-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <div className="text-[14px] font-medium text-text-muted mb-1">
              Halaman / Request Saya
            </div>
            <h1 className="text-[32px] font-bold text-text-main">Request Saya</h1>
            <p className="text-text-muted text-[15px] mt-1">
              Pantau semua request kerja sama yang Anda kirim, dari awal hingga selesai.
            </p>
          </div>
          <div className="flex items-center gap-5 bg-card-bg px-5 py-2.5 rounded-[30px] shadow-sm">
            <NotificationBell />
            <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold border-2 border-white shadow-sm">
              {industriNama.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <RequestSayaClient items={items} />
      </div>
    </div>
  );
}
