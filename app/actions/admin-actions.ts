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

  // Kirim notifikasi ke user via RPC (bypass RLS insert)
  await supabase.rpc('kirim_notifikasi', {
    p_target_user_id: userId,
    p_pesan: 'Selamat! Dokumen legalitas Anda telah diverifikasi oleh Admin. Akun Anda kini aktif dan dapat digunakan.',
  });

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

  // Kirim notifikasi ke user via RPC
  await supabase.rpc('kirim_notifikasi', {
    p_target_user_id: userId,
    p_pesan: `Mohon maaf, dokumen legalitas Anda ditolak. Alasan: ${reason}. Silakan unggah ulang dokumen perbaikan.`,
  });

  revalidatePath('/admin');
  return { success: true, message: `${updatedDocs.length} dokumen berhasil ditolak.` };
}

export async function uploadBuktiPembayaranUmkm(
  pembayaranId: number,
  buktiPath: string
) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Admin tidak terautentikasi.' };

  const { data: adminProfile } = await db.from('users').select('role').eq('id', user.id).single();
  if (!adminProfile || adminProfile.role !== 'admin') return { success: false, error: 'Anda tidak memiliki akses admin.' };

  const { data: pem } = await db.from('pembayaran').select('id, status, bukti_pengiriman, bukti_pembayaran_umkm').eq('id', pembayaranId).single();
  if (!pem) return { success: false, error: 'Data pembayaran tidak ditemukan.' };
  if (pem.status !== 'berhasil') return { success: false, error: 'Pembayaran industri belum divalidasi.' };
  if (!pem.bukti_pengiriman) return { success: false, error: 'UMKM belum upload bukti pengiriman barang.' };
  if (pem.bukti_pembayaran_umkm) return { success: false, error: 'Bukti pembayaran ke UMKM sudah pernah diupload.' };

  const { error } = await db.from('pembayaran').update({
    bukti_pembayaran_umkm: buktiPath,
    status_pencairan: 'diproses',
  }).eq('id', pembayaranId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/dashboard/transaksi');
  return { success: true };
}

export async function deactivateProduct(produkId: number) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Admin tidak terautentikasi.' };

  const { data: adminProfile } = await db.from('users').select('role').eq('id', user.id).single();
  if (!adminProfile || adminProfile.role !== 'admin') return { success: false, error: 'Anda tidak memiliki akses admin.' };

  const { error } = await db.from('produk').update({ is_active: false }).eq('id', produkId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/katalog-publik');
  return { success: true };
}

export async function reactivateProduct(produkId: number) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Admin tidak terautentikasi.' };

  const { data: adminProfile } = await db.from('users').select('role').eq('id', user.id).single();
  if (!adminProfile || adminProfile.role !== 'admin') return { success: false, error: 'Anda tidak memiliki akses admin.' };

  const { error } = await db.from('produk').update({ is_active: true }).eq('id', produkId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/katalog-publik');
  return { success: true };
}

export async function blockUser(targetUserId: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Admin tidak terautentikasi.' };

  const { data: adminProfile } = await db.from('users').select('role').eq('id', user.id).single();
  if (!adminProfile || adminProfile.role !== 'admin') return { success: false, error: 'Anda tidak memiliki akses admin.' };

  if (targetUserId === user.id) return { success: false, error: 'Admin tidak dapat memblokir dirinya sendiri.' };

  const { error } = await db.from('users').update({ is_blocked: true }).eq('id', targetUserId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function unblockUser(targetUserId: string) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Admin tidak terautentikasi.' };

  const { data: adminProfile } = await db.from('users').select('role').eq('id', user.id).single();
  if (!adminProfile || adminProfile.role !== 'admin') return { success: false, error: 'Anda tidak memiliki akses admin.' };

  const { error } = await db.from('users').update({ is_blocked: false }).eq('id', targetUserId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function verifyPayment(pembayaranId: number, transaksiId: number) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Admin tidak terautentikasi. Silakan login ulang.' };

  const { data: adminProfile } = await db.from('users').select('role').eq('id', user.id).single();
  if (!adminProfile || adminProfile.role !== 'admin') return { success: false, error: 'Anda tidak memiliki akses admin.' };

  // Derive user IDs dari DB — tidak percaya data dari client
  const { data: relasi } = await db
    .from('pembayaran')
    .select('transaksi:transaksi_id(request:request_id(industri:industri_id(user_id), umkm:umkm_id(user_id)))')
    .eq('id', pembayaranId)
    .single();

  const req = relasi?.transaksi?.request;
  const industriUserId = req?.industri?.user_id;
  const umkmUserId = req?.umkm?.user_id;

  if (!industriUserId || !umkmUserId) {
    return { success: false, error: 'Data relasi Industri/UMKM tidak ditemukan.' };
  }

  const { error: paymentError } = await db.from('pembayaran').update({ status: 'berhasil' }).eq('id', pembayaranId);
  if (paymentError) return { success: false, error: 'Gagal mengupdate status pembayaran.' };

  const { error: transaksiError } = await db
    .from('transaksi')
    .update({ status: 'lunas', status_validasi: 'valid' })
    .eq('id', transaksiId);
  if (transaksiError) return { success: false, error: 'Gagal mengupdate status transaksi.' };

  await Promise.all([
    supabase.rpc('kirim_notifikasi', { p_target_user_id: industriUserId, p_pesan: 'Pembayaran Anda telah diverifikasi. Proyek dapat dimulai.' }),
    supabase.rpc('kirim_notifikasi', { p_target_user_id: umkmUserId, p_pesan: 'Pembayaran telah masuk, silakan mulai pengerjaan.' }),
  ]);

  revalidatePath('/admin');
  return { success: true, message: 'Pembayaran berhasil diverifikasi.' };
}

export async function rejectPayment(pembayaranId: number, transaksiId: number) {
  const supabase = await createClient();
  const db = supabaseAny(supabase);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Admin tidak terautentikasi. Silakan login ulang.' };

  const { data: adminProfile } = await db.from('users').select('role').eq('id', user.id).single();
  if (!adminProfile || adminProfile.role !== 'admin') return { success: false, error: 'Anda tidak memiliki akses admin.' };

  // Derive industriUserId dari DB
  const { data: relasi } = await db
    .from('pembayaran')
    .select('transaksi:transaksi_id(request:request_id(industri:industri_id(user_id)))')
    .eq('id', pembayaranId)
    .single();

  const industriUserId = relasi?.transaksi?.request?.industri?.user_id;
  if (!industriUserId) return { success: false, error: 'Data industri tidak ditemukan.' };

  const { error: paymentError } = await db.from('pembayaran').update({ status: 'gagal' }).eq('id', pembayaranId);
  if (paymentError) return { success: false, error: 'Gagal menolak pembayaran.' };

  const { error: transaksiError } = await db.from('transaksi').update({ status_validasi: 'tidak valid' }).eq('id', transaksiId);
  if (transaksiError) return { success: false, error: 'Gagal mengupdate status transaksi.' };

  await supabase.rpc('kirim_notifikasi', { p_target_user_id: industriUserId, p_pesan: 'Bukti pembayaran ditolak. Silakan upload ulang.' });

  revalidatePath('/admin');
  return { success: true, message: 'Pembayaran berhasil ditolak.' };
}
