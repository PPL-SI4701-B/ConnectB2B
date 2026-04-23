'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function verifyDocument(documentId: number, userId: string) {
  const supabase = createClient();

  // Update status_verifikasi di dokumen_legalitas
  const { error: updateError } = await supabase
    .from('dokumen_legalitas')
    // @ts-ignore
    .update({ status_verifikasi: 'terverifikasi' })
    .eq('id', documentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Insert notifikasi
  const { error: notifyError } = await supabase
    .from('notifikasi')
    // @ts-ignore
    .insert({
      user_id: userId,
      pesan: 'Selamat! Dokumen legalitas Anda telah diverifikasi oleh Admin. Akun Anda kini menjadi valid.',
      status: 'belum dibaca',
    });

  if (notifyError) {
    console.error('Failed to insert notification:', notifyError);
    // Kita tetap return sukses karena core actionnya berhasil
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function rejectDocument(documentId: number, userId: string, reason: string) {
  const supabase = createClient();

  // Update status_verifikasi & catatan_admin di dokumen_legalitas
  const { error: updateError } = await supabase
    .from('dokumen_legalitas')
    // @ts-ignore
    .update({ 
      status_verifikasi: 'ditolak',
      catatan_admin: reason 
    })
    .eq('id', documentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Insert notifikasi
  const { error: notifyError } = await supabase
    .from('notifikasi')
    // @ts-ignore
    .insert({
      user_id: userId,
      pesan: `Mohon maaf, dokumen legalitas Anda ditolak. Alasan: ${reason}. Silakan perbarui dokumen Anda.`,
      status: 'belum dibaca',
    });

  if (notifyError) {
    console.error('Failed to insert notification:', notifyError);
  }

  revalidatePath('/admin');
  return { success: true };
}
