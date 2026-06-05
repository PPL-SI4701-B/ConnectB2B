'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = (client: any) => client as any;

export async function verifyUserDocuments(userId: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  // Gunakan getUser() — aman untuk server (tidak bisa dipalsukan)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Admin tidak terautentikasi. Silakan login ulang.' };
  }
  const adminId = user.id;

  // Verifikasi bahwa user ini memang admin
  const { data: adminProfile } = await db
    .from('users')
    .select('role')
    .eq('id', adminId)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { success: false, error: 'Anda tidak memiliki akses admin.' };
  }

  // Update status_verifikasi di dokumen_legalitas
  // Trigger sync_user_verification_status akan otomatis update status di tabel users
  const { data: updatedDocs, error: docError } = await db
    .from('dokumen_legalitas')
    .update({ status_verifikasi: 'terverifikasi' })
    .eq('user_id', userId)
    .eq('status_verifikasi', 'menunggu')
    .select('id');

  if (docError) {
    console.error('[Admin Action] Gagal update dokumen_legalitas:', docError);
    return { success: false, error: docError.message };
  }

  if (!updatedDocs || updatedDocs.length === 0) {
    return { success: false, error: 'Tidak ada dokumen menunggu verifikasi untuk user ini.' };
  }

  // Update users table secara eksplisit sebagai fallback
  // (Trigger harusnya sudah handle, tapi kita pastikan)
  const { error: userError } = await db
    .from('users')
    .update({
      status_verifikasi: 'terverifikasi',
      verified_by: adminId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (userError) {
    console.error('[Admin Action] Gagal update users:', userError);
    // Tidak return error karena trigger harusnya sudah handle
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
    console.error('[Admin Action] Gagal insert notifikasi:', notifyError);
    // Non-critical, jangan gagalkan proses
  }

  revalidatePath('/admin');
  return { success: true, message: `${updatedDocs.length} dokumen berhasil diverifikasi.` };
}

export async function rejectUserDocuments(userId: string, reason: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  // Validasi input
  if (!reason || !reason.trim()) {
    return { success: false, error: 'Alasan penolakan wajib diisi.' };
  }

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Admin tidak terautentikasi. Silakan login ulang.' };
  }

  // Verifikasi bahwa user ini memang admin
  const { data: adminProfile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { success: false, error: 'Anda tidak memiliki akses admin.' };
  }

  // Update status_verifikasi & catatan_admin di dokumen_legalitas
  // Trigger sync_user_verification_status akan otomatis update status di tabel users
  const { data: updatedDocs, error: docError } = await db
    .from('dokumen_legalitas')
    .update({
      status_verifikasi: 'ditolak',
      catatan_admin: reason,
    })
    .eq('user_id', userId)
    .eq('status_verifikasi', 'menunggu')
    .select('id');

  if (docError) {
    console.error('[Admin Action] Gagal update dokumen_legalitas:', docError);
    return { success: false, error: docError.message };
  }

  if (!updatedDocs || updatedDocs.length === 0) {
    return { success: false, error: 'Tidak ada dokumen menunggu verifikasi untuk user ini.' };
  }

  // Update users table secara eksplisit sebagai fallback
  const { error: userError } = await db
    .from('users')
    .update({ status_verifikasi: 'ditolak' })
    .eq('id', userId);

  if (userError) {
    console.error('[Admin Action] Gagal update users:', userError);
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
    console.error('[Admin Action] Gagal insert notifikasi:', notifyError);
  }

  revalidatePath('/admin');
  return { success: true, message: `${updatedDocs.length} dokumen berhasil ditolak.` };
}

export async function verifyPayment(pembayaranId: number, transaksiId: number, industriUserId: string, umkmUserId: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Admin tidak terautentikasi. Silakan login ulang.' };
  }

  // Verifikasi admin
  const { data: adminProfile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { success: false, error: 'Anda tidak memiliki akses admin.' };
  }

  // 1. Update pembayaran SET status = 'berhasil'
  const { error: paymentError } = await db
    .from('pembayaran')
    .update({ status: 'berhasil' })
    .eq('id', pembayaranId);

  if (paymentError) {
    console.error('[Admin Action] Gagal update pembayaran:', paymentError);
    return { success: false, error: 'Gagal mengupdate status pembayaran.' };
  }

  // 2. Update transaksi SET status = 'lunas', status_validasi = 'valid'
  const { error: transaksiError } = await db
    .from('transaksi')
    .update({
      status: 'lunas',
      status_validasi: 'valid'
    })
    .eq('id', transaksiId);

  if (transaksiError) {
    console.error('[Admin Action] Gagal update transaksi:', transaksiError);
    return { success: false, error: 'Gagal mengupdate status transaksi.' };
  }

  // 3. Insert notifikasi ke Industri & UMKM
  const notifikasiData = [
    {
      user_id: industriUserId,
      pesan: 'Pembayaran Anda telah diverifikasi. Proyek dapat dimulai.',
      status: 'belum dibaca'
    },
    {
      user_id: umkmUserId,
      pesan: 'Pembayaran telah masuk, silakan mulai pengerjaan.',
      status: 'belum dibaca'
    }
  ];

  const { error: notifyError } = await db
    .from('notifikasi')
    .insert(notifikasiData);

  if (notifyError) {
    console.error('[Admin Action] Gagal insert notifikasi pembayaran:', notifyError);
  }

  revalidatePath('/admin');
  return { success: true, message: 'Pembayaran berhasil diverifikasi.' };
}

export async function rejectPayment(pembayaranId: number, transaksiId: number, industriUserId: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Admin tidak terautentikasi. Silakan login ulang.' };
  }

  // Verifikasi admin
  const { data: adminProfile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { success: false, error: 'Anda tidak memiliki akses admin.' };
  }

  // 1. Update pembayaran SET status = 'gagal'
  const { error: paymentError } = await db
    .from('pembayaran')
    .update({ status: 'gagal' })
    .eq('id', pembayaranId);

  if (paymentError) {
    console.error('[Admin Action] Gagal update pembayaran:', paymentError);
    return { success: false, error: 'Gagal menolak pembayaran.' };
  }

  // 2. Update transaksi SET status_validasi = 'tidak valid'
  const { error: transaksiError } = await db
    .from('transaksi')
    .update({
      status_validasi: 'tidak valid'
    })
    .eq('id', transaksiId);

  if (transaksiError) {
    console.error('[Admin Action] Gagal update transaksi:', transaksiError);
    return { success: false, error: 'Gagal mengupdate status transaksi.' };
  }

  // 3. Insert notifikasi ke Industri
  const { error: notifyError } = await db
    .from('notifikasi')
    .insert({
      user_id: industriUserId,
      pesan: 'Bukti pembayaran ditolak. Silakan upload ulang.',
      status: 'belum dibaca'
    });

  if (notifyError) {
    console.error('[Admin Action] Gagal insert notifikasi penolakan pembayaran:', notifyError);
  }

  revalidatePath('/admin');
  return { success: true, message: 'Pembayaran berhasil ditolak.' };
}

export async function blockUser(userId: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Admin tidak terautentikasi. Silakan login ulang.' };
  }

  // Verifikasi admin
  const { data: adminProfile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { success: false, error: 'Anda tidak memiliki akses admin.' };
  }

  const { error: updateError } = await db
    .from('users')
    .update({ is_blocked: true })
    .eq('id', userId);

  if (updateError) {
    console.error('[Admin Action] Gagal memblokir user:', updateError);
    return { success: false, error: 'Gagal memblokir akun pengguna.' };
  }

  // Insert notifikasi ke user
  const { error: notifyError } = await db
    .from('notifikasi')
    .insert({
      user_id: userId,
      pesan: 'Akun Anda telah diblokir oleh admin.',
      status: 'belum dibaca'
    });

  if (notifyError) {
    console.error('[Admin Action] Gagal insert notifikasi blokir:', notifyError);
  }

  revalidatePath('/admin/kelola-pengguna');
  return { success: true, message: 'Akun berhasil diblokir.' };
}

export async function unblockUser(userId: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Admin tidak terautentikasi. Silakan login ulang.' };
  }

  // Verifikasi admin
  const { data: adminProfile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { success: false, error: 'Anda tidak memiliki akses admin.' };
  }

  const { error: updateError } = await db
    .from('users')
    .update({ is_blocked: false })
    .eq('id', userId);

  if (updateError) {
    console.error('[Admin Action] Gagal mencabut blokir user:', updateError);
    return { success: false, error: 'Gagal mencabut blokir akun pengguna.' };
  }

  // Insert notifikasi ke user
  const { error: notifyError } = await db
    .from('notifikasi')
    .insert({
      user_id: userId,
      pesan: 'Blokir akun Anda telah dicabut.',
      status: 'belum dibaca'
    });

  if (notifyError) {
    console.error('[Admin Action] Gagal insert notifikasi unblock:', notifyError);
  }

  revalidatePath('/admin/kelola-pengguna');
  return { success: true, message: 'Blokir akun berhasil dicabut.' };
}
