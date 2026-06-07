'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function updateTransaksiProgress(
  transaksiId: number,
  newStatus: string,
  pesan: string
) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // FR-15: hanya role UMKM yang boleh memperbarui status progres
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as any;
    if ((userRow?.role || '').toLowerCase() !== 'umkm') {
      return { success: false, error: 'Hanya UMKM yang dapat memperbarui status kerja sama.' };
    }

    // Verifikasi caller adalah UMKM dan transaksi ini miliknya, sekaligus ambil industri user_id
    const { data: umkm } = await supabase
      .from('umkm')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!umkm) return { success: false, error: 'Profil UMKM tidak ditemukan' };

    const { data: transaksiData } = await supabase
      .from('transaksi')
      .select('id, request:request_id(umkm_id, industri:industri_id(user_id))')
      .eq('id', transaksiId)
      .maybeSingle() as any;

    if (!transaksiData) return { success: false, error: 'Transaksi tidak ditemukan' };

    const req = Array.isArray(transaksiData.request) ? transaksiData.request[0] : transaksiData.request;
    if (req?.umkm_id !== umkm.id) return { success: false, error: 'Anda tidak memiliki akses ke transaksi ini' };

    // 1. Update transaksi
    const { error: updateError } = await supabase
      .from('transaksi')
      .update({ progress_status: newStatus })
      .eq('id', transaksiId);

    if (updateError) return { success: false, error: 'Gagal mengupdate status transaksi' };

    // 2. Insert history
    const { error: historyError } = await supabase
      .from('transaksi_history')
      .insert({ transaksi_id: transaksiId, status_progress: newStatus, pesan: pesan || null });

    if (historyError) return { success: false, error: 'Gagal mencatat riwayat transaksi' };

    // 3. Notifikasi ke Industri (ambil user_id dari relasi yang sudah di-fetch)
    const industri = Array.isArray(req?.industri) ? req.industri[0] : req?.industri;
    if (industri?.user_id) {
      await supabase.rpc('kirim_notifikasi', {
        p_target_user_id: industri.user_id,
        p_pesan: `Update Transaksi: Status progres TRX-${transaksiId.toString().padStart(4, '0')} diperbarui menjadi "${newStatus}".`,
      });
    }

    revalidatePath('/dashboard/transaksi');
    revalidatePath('/dashboard-industri/transaksi');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in updateTransaksiProgress:', err);
    return { success: false, error: 'Terjadi kesalahan sistem' };
  }
}

export async function uploadPaymentProof(
  transaksiId: number,
  buktiTransferUrl: string,
  industriName: string
) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Silakan masuk kembali.' };
    }

    // Guard: jangan izinkan upload ulang jika transaksi sudah lunas / pembayaran sudah divalidasi
    const { data: trx } = await supabase
      .from('transaksi')
      .select('status, status_validasi')
      .eq('id', transaksiId)
      .maybeSingle() as any;

    if (!trx) {
      return { success: false, error: 'Transaksi tidak ditemukan.' };
    }
    if (trx.status === 'lunas' || trx.status_validasi === 'valid') {
      return { success: false, error: 'Transaksi ini sudah lunas dan tervalidasi. Tidak perlu upload ulang.' };
    }

    // 2. Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('pembayaran')
      .select('id, status')
      .eq('transaksi_id', transaksiId)
      .maybeSingle() as any;

    if (existingPayment?.status === 'berhasil') {
      return { success: false, error: 'Pembayaran untuk transaksi ini sudah divalidasi.' };
    }

    if (existingPayment) {
      // Update existing payment
      const { error: updateError } = await supabase
        .from('pembayaran')
        .update({
          bukti_transfer: buktiTransferUrl,
          tanggal_bayar: new Date().toISOString(),
          status: 'pending'
        })
        .eq('id', existingPayment.id);

      if (updateError) {
        console.error('Error updating pembayaran:', updateError);
        return { success: false, error: 'Gagal memperbarui data pembayaran.' };
      }
    } else {
      // Insert new payment
      const { error: insertError } = await supabase
        .from('pembayaran')
        .insert({
          transaksi_id: transaksiId,
          bukti_transfer: buktiTransferUrl,
          tanggal_bayar: new Date().toISOString(),
          status: 'pending'
        });

      if (insertError) {
        console.error('Error inserting pembayaran:', insertError);
        return { success: false, error: 'Gagal mencatat data pembayaran baru.' };
      }
    }

    // 3. Update transaksi SET status_validasi = 'menunggu'
    const { error: transaksiError } = await supabase
      .from('transaksi')
      .update({
        status_validasi: 'menunggu'
      })
      .eq('id', transaksiId);

    if (transaksiError) {
      console.error('Error updating transaksi validasi:', transaksiError);
      return { success: false, error: 'Gagal memperbarui status validasi transaksi.' };
    }

    // 4. Send notification to all Admins for validation
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (adminUsers && adminUsers.length > 0) {
      const notifikasiInserts = adminUsers.map((admin: any) => ({
        user_id: admin.id,
        pesan: `Pembayaran Baru: Industri "${industriName}" telah mengunggah bukti pembayaran untuk transaksi TRX-${transaksiId.toString().padStart(4, '0')}. Silakan lakukan validasi.`,
        status: 'belum dibaca' as const
      }));

      const { error: notifyError } = await supabase
        .from('notifikasi')
        .insert(notifikasiInserts);

      if (notifyError) {
        console.error('Error inserting admin notifications:', notifyError);
      }
    }

    revalidatePath('/dashboard/transaksi');
    revalidatePath('/dashboard-industri/transaksi');
    revalidatePath('/admin');

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in uploadPaymentProof:', err);
    return { success: false, error: 'Terjadi kesalahan sistem.' };
  }
}

