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

  // Fetch transaksi linked to this UMKM's requests
  const { data: transaksiRaw, error } = await supabase
    .from('transaksi')
    .select(`
      id,
      request_id,
      status,
      status_validasi,
      tanggal_mulai,
      tanggal_selesai,
      request:request_id (
        id,
        industri_id,
        pesan,
        status,
        umkm_id
      )
    `)
    .order('tanggal_mulai', { ascending: false });

  if (error) {
    console.error('Error fetching transaksi:', error);
  }

  // Filter transaksi that belong to this UMKM
  const transaksiFiltered = (transaksiRaw || []).filter((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    return req?.umkm_id === umkm.id;
  });

  // Fetch industri details
  const industriIds = Array.from(
    new Set(
      transaksiFiltered.map((t: any) => {
        const req = Array.isArray(t.request) ? t.request[0] : t.request;
        return req?.industri_id;
      }).filter(Boolean)
    )
  ) as number[];

  let industriMap: Record<number, string> = {};
  if (industriIds.length > 0) {
    const { data: industris } = await supabase
      .from('industri')
      .select('id, nama_perusahaan')
      .in('id', industriIds);

    (industris || []).forEach((ind: any) => {
      industriMap[ind.id] = ind.nama_perusahaan;
    });
  }

  // Format for client
  const formattedTransaksi = transaksiFiltered.map((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    const industriNama = industriMap[req?.industri_id] || 'Mitra Tidak Diketahui';

    return {
      id: t.id,
      trxCode: `TRX-${t.id.toString().padStart(4, '0')}`,
      status: t.status,
      statusValidasi: t.status_validasi,
      tanggalMulai: t.tanggal_mulai,
      tanggalSelesai: t.tanggal_selesai,
      pesan: req?.pesan || '-',
      industriNama,
    };
  });

  return <TransaksiClient transaksi={formattedTransaksi} umkmName={umkm.nama_usaha} />;
}
