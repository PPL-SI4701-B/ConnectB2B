import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import RequestMasukClient from './RequestMasukClient';

export const metadata = {
  title: 'Request Masuk | ConnectB2B',
  description: 'Tinjau dan respon permintaan kerja sama yang masuk dari Industri atau UMKM lain.',
};

export const dynamic = 'force-dynamic';

export default async function RequestMasukPage() {
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

  // Fetch all requests targeting this UMKM
  const { data: requestsRaw, error } = await supabase
    .from('request')
    .select('id, industri_id, pesan, status, tanggal_request, produk_id, equipment_id')
    .eq('umkm_id', umkm.id)
    .order('tanggal_request', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error);
  }

  const requests = (requestsRaw || []) as any[];

  // Fetch industri details for sender info
  const industriIds = Array.from(new Set(requests.map(r => r.industri_id).filter(Boolean))) as number[];
  let industriMap: Record<number, { nama_perusahaan: string; lokasi: string | null }> = {};

  if (industriIds.length > 0) {
    const { data: industris } = await supabase
      .from('industri')
      .select('id, nama_perusahaan, lokasi')
      .in('id', industriIds);

    (industris || []).forEach((ind: any) => {
      industriMap[ind.id] = { nama_perusahaan: ind.nama_perusahaan, lokasi: ind.lokasi };
    });
  }

  // Format requests for the client component
  const formattedRequests = requests.map(req => {
    const industri = industriMap[req.industri_id] || { nama_perusahaan: 'Pengirim Tidak Diketahui', lokasi: null };
    return {
      id: req.id,
      pesan: req.pesan,
      status: req.status,
      tanggal_request: req.tanggal_request,
      industri_nama: industri.nama_perusahaan,
      industri_lokasi: industri.lokasi,
      initials: industri.nama_perusahaan.substring(0, 2).toUpperCase(),
    };
  });

  return <RequestMasukClient requests={formattedRequests} umkmName={umkm.nama_usaha} />;
}
