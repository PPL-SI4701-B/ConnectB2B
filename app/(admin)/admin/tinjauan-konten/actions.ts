'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function hapusKontenAction(
  laporanId: number,
  produkId: number,
  katalogType: 'produk' | 'equipment',
  umkmUserId: string,
  namaProduk: string,
  gambarUrl?: string | null
) {
  const supabase = await createClient();

  const table = katalogType === 'produk' ? 'produk' : 'equipment';
  const label = katalogType === 'produk' ? 'Produk' : 'Alat/Mesin';

  // Soft-delete: nonaktifkan produk/alat, jangan hard delete.
  const { error: deleteError } = await (supabase as any)
    .from(table)
    .update({ is_active: false })
    .eq('id', produkId);

  if (deleteError) {
    console.error(`Error deactivating ${katalogType}:`, deleteError);
    return { success: false, error: `Gagal menonaktifkan ${label.toLowerCase()}.` };
  }

  // Insert notification to the UMKM owner
  const { error: notifError } = await supabase
    .from('notifikasi')
    .insert({
      user_id: umkmUserId,
      pesan: `katalog anda menjual barang duplikasi`,
      status: 'belum dibaca',
    });

  if (notifError) {
    console.error('Error inserting notification:', notifError);
    // Continue even if notif fails
  }

  // 4. Update laporan_konten status to 'dihapus'
  const { error: updateError } = await supabase
    .from('laporan_konten')
    .update({ status: 'dihapus' })
    .eq('id', laporanId);

  if (updateError) {
    console.error('Error updating laporan status:', updateError);
    return { success: false, error: 'Gagal mengubah status laporan.' };
  }

  revalidatePath('/admin/tinjauan-konten');
  return { success: true };
}

export async function abaikanKontenAction(laporanId: number) {
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from('laporan_konten')
    .update({ status: 'diabaikan' })
    .eq('id', laporanId);

  if (updateError) {
    console.error('Error updating laporan status:', updateError);
    return { success: false, error: 'Gagal mengabaikan laporan.' };
  }

  revalidatePath('/admin/tinjauan-konten');
  return { success: true };
}
