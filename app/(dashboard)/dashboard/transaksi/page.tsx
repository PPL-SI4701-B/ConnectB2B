import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import TransaksiClient from './TransaksiClient';

export const metadata = {
  title: 'Transaksi | ConnectB2B',
  description: 'Pantau progres kerja sama, pembayaran, dan ulasan proyek.',
};

export const dynamic = 'force-dynamic';

export default async function TransaksiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // FR-15: update status kerja sama hanya untuk UMKM.
  // Cegah Industri/Admin mengakses halaman ini (arahkan ke halaman yang sesuai),
  // bahkan jika akun kebetulan memiliki profil UMKM ganda.
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as any;

  const role = (userRow?.role || '').toLowerCase();
  if (role === 'industri') {
    redirect('/pantau-transaksi');
  }
  if (role === 'admin') {
    redirect('/admin');
  }

  // Get current user's UMKM profile
  const { data: umkm } = await supabase
    .from('umkm')
    .select('id, nama_usaha')
    .eq('user_id', user.id)
    .single();

  if (!umkm) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center text-gray-500">
        Profil UMKM Anda belum lengkap. Lengkapi profil Anda terlebih dahulu.
      </div>
    );
  }

  const selectFragment = `
    id,
    request_id,
    status,
    status_validasi,
    tanggal_mulai,
    tanggal_selesai,
    progress_status,
    bukti_pengiriman_umkm,
    konfirmasi_penerimaan,
    request:request_id (
      id,
      industri_id,
      sender_umkm_id,
      pesan,
      status,
      umkm_id
    ),
    transaksi_history (
      id,
      status_progress,
      pesan,
      created_at
    ),
    pembayaran (
      id,
      status,
      bukti_pengiriman,
      status_pengiriman,
      bukti_pembayaran_umkm,
      status_pencairan,
      bukti_terima_umkm
    )
  `;

  // Fetch transaksi where UMKM is the recipient
  const { data: transaksiAsReceiver } = await supabase
    .from('transaksi')
    .select(selectFragment)
    .order('tanggal_mulai', { ascending: false }) as any;

  const allTranaksi = (transaksiAsReceiver || []) as any[];

  // Filter: show transaksi where this UMKM is recipient OR sender
  const transaksiFiltered = allTranaksi.filter((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    return req?.umkm_id === umkm.id || req?.sender_umkm_id === umkm.id;
  });

  // Fetch industri details for requests with industri_id
  const industriIds = Array.from(
    new Set(
      transaksiFiltered.map((t: any) => {
        const req = Array.isArray(t.request) ? t.request[0] : t.request;
        return req?.industri_id;
      }).filter(Boolean)
    )
  ) as number[];

  // Fetch UMKM details for sender_umkm_id (UMKM-to-UMKM requests)
  const senderUmkmIds = Array.from(
    new Set(
      transaksiFiltered.map((t: any) => {
        const req = Array.isArray(t.request) ? t.request[0] : t.request;
        // If current UMKM is receiver, sender_umkm_id is the mitra
        if (req?.umkm_id === umkm.id && req?.sender_umkm_id) return req.sender_umkm_id;
        // If current UMKM is sender, umkm_id is the mitra
        if (req?.sender_umkm_id === umkm.id) return req.umkm_id;
        return null;
      }).filter(Boolean)
    )
  ) as number[];

  let industriMap: Record<number, string> = {};
  if (industriIds.length > 0) {
    const { data: industris } = await supabase
      .from('industri')
      .select('id, nama_perusahaan')
      .in('id', industriIds);
    (industris || []).forEach((ind: any) => { industriMap[ind.id] = ind.nama_perusahaan; });
  }

  let umkmMitraMap: Record<number, string> = {};
  if (senderUmkmIds.length > 0) {
    const { data: umkmMitras } = await supabase
      .from('umkm')
      .select('id, nama_usaha')
      .in('id', senderUmkmIds);
    (umkmMitras || []).forEach((u: any) => { umkmMitraMap[u.id] = u.nama_usaha; });
  }

  // Format for client
  const formattedTransaksi = transaksiFiltered.map((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    const isSender = req?.sender_umkm_id === umkm.id;
    let mitraNama = 'Mitra Tidak Diketahui';
    let mitraId = req?.industri_id;

    if (req?.industri_id) {
      mitraNama = industriMap[req.industri_id] || mitraNama;
    } else if (isSender) {
      // Current UMKM sent to another UMKM — mitra is umkm_id
      mitraNama = umkmMitraMap[req?.umkm_id] || mitraNama;
    } else if (req?.sender_umkm_id) {
      // Current UMKM received from another UMKM — mitra is sender_umkm_id
      mitraNama = umkmMitraMap[req?.sender_umkm_id] || mitraNama;
    }

    const pembayaranArr = Array.isArray(t.pembayaran) ? t.pembayaran : (t.pembayaran ? [t.pembayaran] : []);
    const pem = pembayaranArr[0] ?? null;

    return {
      id: t.id,
      trxCode: `TRX-${t.id.toString().padStart(4, '0')}`,
      status: t.status,
      statusValidasi: t.status_validasi,
      progressStatus: t.progress_status || 'Menunggu Material',
      history: (t.transaksi_history || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      tanggalMulai: t.tanggal_mulai,
      tanggalSelesai: t.tanggal_selesai,
      pesan: req?.pesan || '-',
      industriId: mitraId,
      industriNama: mitraNama,
      pembayaranId: pem?.id ?? null,
      pembayaranStatus: pem?.status ?? null,
      buktiPengiriman: pem?.bukti_pengiriman ?? null,
      statusPengiriman: pem?.status_pengiriman ?? 'menunggu',
      buktiPembayaranUmkm: pem?.bukti_pembayaran_umkm ?? null,
      statusPencairan: pem?.status_pencairan ?? 'menunggu',
      buktiTerimaUang: pem?.bukti_terima_umkm ?? null,
      buktiKirimUmkm: t.bukti_pengiriman_umkm ?? null,
      konfirmasiPenerimaan: t.konfirmasi_penerimaan ?? false,
    };
  });

  return <TransaksiClient transaksi={formattedTransaksi} umkmName={umkm.nama_usaha} />;
}
