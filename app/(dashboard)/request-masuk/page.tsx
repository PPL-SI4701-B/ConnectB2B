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
    .select('id, industri_id, sender_umkm_id, pesan, status, tanggal_request, produk_id, equipment_id')
    .eq('umkm_id', umkm.id)
    .order('tanggal_request', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error);
  }

  const requests = (requestsRaw || []) as any[];

  // Fetch industri and umkm details for sender info
  const industriIds = Array.from(new Set(requests.map(r => r.industri_id).filter(Boolean))) as number[];
  const umkmSenderIds = Array.from(new Set(requests.map(r => r.sender_umkm_id).filter(Boolean))) as number[];
  
  let senderMap: Record<string, { nama: string; lokasi: string | null }> = {};

  if (industriIds.length > 0) {
    const { data: industris } = await supabase
      .from('industri')
      .select('id, nama_perusahaan, lokasi')
      .in('id', industriIds);

    (industris || []).forEach((ind: any) => {
      senderMap[`ind_${ind.id}`] = { nama: ind.nama_perusahaan, lokasi: ind.lokasi };
    });
  }

  if (umkmSenderIds.length > 0) {
    const { data: umkms } = await supabase
      .from('umkm')
      .select('id, nama_usaha, alamat')
      .in('id', umkmSenderIds);

    (umkms || []).forEach((u: any) => {
      senderMap[`umkm_${u.id}`] = { nama: u.nama_usaha, lokasi: u.alamat };
    });
  }

  // Format requests for the client component
  const formattedRequests = requests.map(req => {
    let sender: { nama: string; lokasi: string | null } = { nama: 'Pengirim Tidak Diketahui', lokasi: null };
    if (req.industri_id) {
      sender = senderMap[`ind_${req.industri_id}`] || sender;
    } else if (req.sender_umkm_id) {
      sender = senderMap[`umkm_${req.sender_umkm_id}`] || sender;
    }

    return {
      id: req.id,
      pesan: req.pesan,
      status: req.status,
      tanggal_request: req.tanggal_request,
      industri_nama: sender.nama,
      industri_lokasi: sender.lokasi,
      initials: sender.nama.substring(0, 2).toUpperCase(),
    };
  });

  return <RequestMasukClient requests={formattedRequests} umkmName={umkm.nama_usaha} />;
}
