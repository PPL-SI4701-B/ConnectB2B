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

    // 2. Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('pembayaran')
      .select('id')
      .eq('transaksi_id', transaksiId)
      .maybeSingle();

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

