'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = (client: any) => client as any;

export async function verifyUserDocuments(userId: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  // Gunakan getUser() — aman untuk server (tidak bisa dipalsukan)
  const { data: { user } } = await supabase.auth.getUser();
  const adminId = user?.id ?? null;

  // Update status_verifikasi di dokumen_legalitas
  const { error: docError } = await db
    .from('dokumen_legalitas')
    .update({ status_verifikasi: 'terverifikasi' })
    .eq('user_id', userId)
    .eq('status_verifikasi', 'menunggu');

  if (docError) {
    return { success: false, error: docError.message };
  }

  // Update status_verifikasi di users
  const { error: userError } = await db
    .from('users')
    .update({
      status_verifikasi: 'terverifikasi',
      verified_by: adminId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (userError) {
    return { success: false, error: userError.message };
  }

  // Kirim notifikasi ke user
  const { error: notifyError } = await db
    .from('notifikasi')
    .insert({
      user_id: userId,
      pesan: 'Selamat! Dokumen legalitas Anda telah diverifikasi oleh Admin. Akun Anda kini aktif dan dapat digunakan.',
      status: 'belum dibaca',
    });

  if (notifyError) {
    console.error('Gagal insert notifikasi:', notifyError);
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function rejectUserDocuments(userId: string, reason: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  // Update status_verifikasi & catatan_admin di dokumen_legalitas
  const { error: docError } = await db
    .from('dokumen_legalitas')
    .update({
      status_verifikasi: 'ditolak',
      catatan_admin: reason,
    })
    .eq('user_id', userId)
    .eq('status_verifikasi', 'menunggu');

  if (docError) {
    return { success: false, error: docError.message };
  }

  // Update status_verifikasi di users
  const { error: userError } = await db
    .from('users')
    .update({ status_verifikasi: 'ditolak' })
    .eq('id', userId);

  if (userError) {
    return { success: false, error: userError.message };
  }

  // Kirim notifikasi ke user
  const { error: notifyError } = await db
    .from('notifikasi')
    .insert({
      user_id: userId,
      pesan: `Mohon maaf, dokumen legalitas Anda ditolak. Alasan: ${reason}. Silakan unggah ulang dokumen perbaikan.`,
      status: 'belum dibaca',
    });

  if (notifyError) {
    console.error('Gagal insert notifikasi:', notifyError);
  }

  revalidatePath('/admin');
  return { success: true };
}
