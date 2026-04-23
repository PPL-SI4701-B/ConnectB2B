'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function verifyUserDocuments(userId: string) {
  const supabase = createClient();

  // Update status_verifikasi di dokumen_legalitas
  const { error: updateError } = await supabase
    .from('dokumen_legalitas')
    // @ts-ignore
    .update({ status_verifikasi: 'terverifikasi' })
    .eq('user_id', userId)
    .eq('status_verifikasi', 'menunggu');

  // Update status_verifikasi di users
  const { data: { session } } = await supabase.auth.getSession();
  const adminId = session?.user?.id;
  await supabase
    .from('users')
    // @ts-ignore
    .update({ 
      status_verifikasi: 'terverifikasi',
      verified_by: adminId || null,
      verified_at: new Date().toISOString()
    })
    .eq('id', userId);

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

export async function rejectUserDocuments(userId: string, reason: string) {
  const supabase = createClient();

  // Update status_verifikasi & catatan_admin di dokumen_legalitas
  const { error: updateError } = await supabase
    .from('dokumen_legalitas')
    // @ts-ignore
    .update({ 
      status_verifikasi: 'ditolak',
      catatan_admin: reason 
    })
    .eq('user_id', userId)
    .eq('status_verifikasi', 'menunggu');

  // Update status_verifikasi di users juga
  await supabase
    .from('users')
    // @ts-ignore
    .update({ status_verifikasi: 'ditolak' })
    .eq('id', userId);

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
