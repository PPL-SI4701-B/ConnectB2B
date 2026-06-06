'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function acceptRequest(requestId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Verify this request belongs to the current user's UMKM
  const { data: umkm } = await supabase
    .from('umkm')
    .select('id, nama_usaha')
    .eq('user_id', user.id)
    .single();

  if (!umkm) throw new Error('Profil UMKM tidak ditemukan');

  const { data: request } = await supabase
    .from('request')
    .select('id, umkm_id, industri_id, sender_umkm_id, pesan, produk_id, equipment_id')
    .eq('id', requestId)
    .eq('umkm_id', umkm.id)
    .eq('status', 'pending')
    .maybeSingle() as any;

  if (!request) throw new Error('Request tidak ditemukan atau sudah diproses');

  // Update request status to 'approve'
  const { error: updateError } = await supabase
    .from('request')
    .update({ status: 'approve' } as any)
    .eq('id', requestId);

  if (updateError) throw updateError;

  // Create transaksi record linked to the request
  const { data: newTransaksi, error: transaksiError } = await supabase
    .from('transaksi')
    .insert({
      request_id: requestId,
      status: 'belum lunas',
      status_validasi: 'menunggu',
    } as any)
    .select('id')
    .single() as any;

  if (transaksiError) throw transaksiError;

  // Isi detail_transaksi jika request punya produk/equipment (direct request)
  if (newTransaksi?.id && (request.produk_id || request.equipment_id)) {
    let harga = 0;
    if (request.produk_id) {
      const { data: produk } = await supabase.from('produk').select('harga').eq('id', request.produk_id).maybeSingle() as any;
      harga = produk?.harga || 0;
    } else if (request.equipment_id) {
      const { data: equip } = await supabase.from('equipment').select('harga_sewa').eq('id', request.equipment_id).maybeSingle() as any;
      harga = equip?.harga_sewa || 0;
    }
    if (harga > 0) {
      await supabase.from('detail_transaksi').insert({
        transaksi_id: newTransaksi.id,
        produk_id: request.produk_id || null,
        equipment_id: request.equipment_id || null,
        kuantitas: 1,
        harga_satuan: harga,
        subtotal: harga,
      } as any);
    }
  }

  // Notify the requester (Industri or sender UMKM)
  if (request.industri_id) {
    const { data: industri } = await supabase
      .from('industri')
      .select('user_id')
      .eq('id', request.industri_id)
      .single();

    if (industri?.user_id) {
      await supabase.rpc('kirim_notifikasi', {
        p_target_user_id: industri.user_id,
        p_pesan: `Request kerja sama Anda telah diterima oleh ${umkm.nama_usaha}. Transaksi telah dibuat, silakan lanjutkan.`,
      });
    }
  } else if (request.sender_umkm_id) {
    const { data: senderUmkm } = await supabase
      .from('umkm')
      .select('user_id, nama_usaha')
      .eq('id', request.sender_umkm_id)
      .single();

    if (senderUmkm?.user_id) {
      await supabase.rpc('kirim_notifikasi', {
        p_target_user_id: senderUmkm.user_id,
        p_pesan: `Request Anda telah diterima oleh ${umkm.nama_usaha}. Transaksi telah dibuat, silakan lanjutkan.`,
      });
    }
  }

  revalidatePath('/request-masuk');
  revalidatePath('/dashboard/transaksi');
  revalidatePath('/pantau-transaksi');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function rejectRequest(requestId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Verify this request belongs to the current user's UMKM
  const { data: umkm } = await supabase
    .from('umkm')
    .select('id, nama_usaha')
    .eq('user_id', user.id)
    .single();

  if (!umkm) throw new Error('Profil UMKM tidak ditemukan');

  const { data: request } = await supabase
    .from('request')
    .select('id, umkm_id, industri_id, sender_umkm_id, pesan')
    .eq('id', requestId)
    .eq('umkm_id', umkm.id)
    .eq('status', 'pending')
    .maybeSingle() as any;

  if (!request) throw new Error('Request tidak ditemukan atau sudah diproses');

  // Update request status to 'ditolak'
  const { error: updateError } = await supabase
    .from('request')
    .update({ status: 'ditolak' } as any)
    .eq('id', requestId);

  if (updateError) throw updateError;

  // Notify the requester (Industri or sender UMKM)
  if (request.industri_id) {
    const { data: industri } = await supabase
      .from('industri')
      .select('user_id')
      .eq('id', request.industri_id)
      .single();

    if (industri?.user_id) {
      await supabase.rpc('kirim_notifikasi', {
        p_target_user_id: industri.user_id,
        p_pesan: `Request kerja sama Anda ditolak oleh ${umkm.nama_usaha}.`,
      });
    }
  } else if (request.sender_umkm_id) {
    const { data: senderUmkm } = await supabase
      .from('umkm')
      .select('user_id')
      .eq('id', request.sender_umkm_id)
      .single();

    if (senderUmkm?.user_id) {
      await supabase.rpc('kirim_notifikasi', {
        p_target_user_id: senderUmkm.user_id,
        p_pesan: `Request Anda ditolak oleh ${umkm.nama_usaha}.`,
      });
    }
  }

  revalidatePath('/request-masuk');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function sendDirectRequest(data: {
  targetUmkmId: number;
  produk_id?: number | null;
  equipment_id?: number | null;
  pesan: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Anda harus login terlebih dahulu');

  // Get the current user's role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userData?.role?.toLowerCase();

  let senderId: number | null = null;
  let senderName = 'Pengirim';
  let isIndustri = false;

  if (role === 'industri') {
    const { data: industri } = await supabase
      .from('industri')
      .select('id, nama_perusahaan')
      .eq('user_id', user.id)
      .single();
    if (!industri) throw new Error('Profil industri Anda belum lengkap.');
    senderId = industri.id;
    senderName = industri.nama_perusahaan;
    isIndustri = true;
  } else {
    const { data: umkm } = await supabase
      .from('umkm')
      .select('id, nama_usaha')
      .eq('user_id', user.id)
      .single();
    if (!umkm) throw new Error('Profil UMKM Anda belum lengkap.');
    senderId = umkm.id;
    senderName = umkm.nama_usaha;
  }

  // Insert request — industri_id is set only when sender is industri
  const { error: reqError } = await supabase.from('request').insert({
    industri_id: isIndustri ? senderId : null,
    sender_umkm_id: !isIndustri ? senderId : null,
    umkm_id: data.targetUmkmId,
    produk_id: data.produk_id || null,
    equipment_id: data.equipment_id || null,
    pesan: data.pesan,
    status: 'pending',
  } as any);

  if (reqError) throw reqError;

  // Send notification to target UMKM
  const { data: targetUmkm } = await supabase
    .from('umkm')
    .select('user_id')
    .eq('id', data.targetUmkmId)
    .single();

  if (targetUmkm?.user_id) {
    await supabase.rpc('kirim_notifikasi', {
      p_target_user_id: targetUmkm.user_id,
      p_pesan: `Anda menerima permintaan kerja sama baru dari ${senderName}`,
    });
  }

  revalidatePath('/request-masuk');
  revalidatePath('/pencarian');
  revalidatePath('/dashboard');
  return { success: true };
}
