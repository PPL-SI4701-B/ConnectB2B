'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function updateTransaksiProgress(
  transaksiId: number,
  newStatus: string,
  pesan: string,
  industriId: number // Needed for notification
) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 1. Update the transaksi table
    const { error: updateError } = await supabase
      .from('transaksi')
      .update({ progress_status: newStatus })
      .eq('id', transaksiId);

    if (updateError) {
      console.error('Error updating progress:', updateError);
      return { success: false, error: 'Gagal mengupdate status transaksi' };
    }

    // 2. Insert into history
    const { error: historyError } = await supabase
      .from('transaksi_history')
      .insert({
        transaksi_id: transaksiId,
        status_progress: newStatus,
        pesan: pesan || null
      });

    if (historyError) {
      console.error('Error inserting history:', historyError);
      return { success: false, error: 'Gagal mencatat riwayat transaksi' };
    }

    // 3. Get the Industri's user_id to send a notification
    // We only have industri_id from the frontend, so we query it
    const { data: industriData } = await supabase
      .from('industri')
      .select('user_id')
      .eq('id', industriId)
      .single();

    if (industriData && industriData.user_id) {
      // 4. Insert notification
      await supabase
        .from('notifikasi')
        .insert({
          user_id: industriData.user_id,
          pesan: `Update Transaksi: Status progres transaksi TRX-${transaksiId.toString().padStart(4, '0')} Anda diperbarui menjadi "${newStatus}".`,
          status: 'belum dibaca'
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
