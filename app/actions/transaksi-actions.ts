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
