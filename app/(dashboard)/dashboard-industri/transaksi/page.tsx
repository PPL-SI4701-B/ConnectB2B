import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import TransaksiIndustriClient from './TransaksiIndustriClient';

export const metadata = {
  title: 'Pantau Transaksi | ConnectB2B',
  description: 'Pantau progres kerja sama, pembayaran, dan ulasan proyek dari sudut pandang Industri.',
};

export const dynamic = 'force-dynamic';

export default async function TransaksiIndustriPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get current user's Industri profile
  const { data: industri } = await supabase
    .from('industri')
    .select('id, nama_perusahaan')
    .eq('user_id', user.id)
    .single();

  if (!industri) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center text-gray-500">
        Profil Industri Anda belum lengkap. Lengkapi profil Anda terlebih dahulu.
      </div>
    );
  }

  // Fetch transaksi linked to this Industri's requests
  // For industri, we look at requests where industri_id matches.
  // Wait, what if the transaction is UMKM to UMKM? This page is for Industri, so we only care about their industri_id.
  const { data: transaksiRaw, error } = await supabase
    .from('transaksi')
    .select(`
      id,
      request_id,
      status,
      status_validasi,
      tanggal_mulai,
      tanggal_selesai,
      progress_status,
      request:request_id (
        id,
        industri_id,
        pesan,
        status,
        umkm_id
      ),
      transaksi_history (
        id,
        status_progress,
        pesan,
        created_at
      )
    `)
    .order('tanggal_mulai', { ascending: false });

  if (error) {
    console.error('Error fetching transaksi:', error);
  }

  // Filter transaksi that belong to this Industri
  const transaksiFiltered = (transaksiRaw || []).filter((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    return req?.industri_id === industri.id;
  });

  // Fetch UMKM details for the target partners
  const umkmIds = Array.from(
    new Set(
      transaksiFiltered.map((t: any) => {
        const req = Array.isArray(t.request) ? t.request[0] : t.request;
        return req?.umkm_id;
      }).filter(Boolean)
    )
  ) as number[];

  let umkmMap: Record<number, string> = {};
  if (umkmIds.length > 0) {
    const { data: umkms } = await supabase
      .from('umkm')
      .select('id, nama_usaha')
      .in('id', umkmIds);

    (umkms || []).forEach((u: any) => {
      umkmMap[u.id] = u.nama_usaha;
    });
  }

  // Format for client
  const formattedTransaksi = transaksiFiltered.map((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    const mitraNama = umkmMap[req?.umkm_id] || 'Mitra UMKM Tidak Diketahui';

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
      mitraNama,
    };
  });

  return <TransaksiIndustriClient transaksi={formattedTransaksi} industriName={industri.nama_perusahaan} />;
}
