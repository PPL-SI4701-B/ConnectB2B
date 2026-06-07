'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

/**
 * Soft-delete: aktif/nonaktifkan item katalog milik UMKM yang sedang login.
 * Tidak menghapus baris (menghindari pelanggaran foreign key dari request/transaksi/keranjang),
 * hanya men-toggle `is_active`. Item nonaktif disembunyikan dari pembeli, tetap terlihat oleh pemilik.
 */
export async function setKatalogItemActive(
  type: 'produk' | 'equipment',
  id: number,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Anda harus login terlebih dahulu.' };

  const table = type === 'produk' ? 'produk' : 'equipment';

  // Verifikasi kepemilikan: hanya pemilik yang boleh mengubah statusnya
  const { data: item } = await (supabase as any)
    .from(table)
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (!item) return { success: false, error: 'Item tidak ditemukan.' };
  if (item.user_id !== user.id) return { success: false, error: 'Anda tidak memiliki akses ke item ini.' };

  const { error } = await (supabase as any)
    .from(table)
    .update({ is_active: active })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/katalog');
  revalidatePath('/pencarian');
  revalidatePath('/katalog-publik');
  return { success: true };
}
