'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function hapusKontenAction(
  laporanId: number,
  produkId: number,
  umkmUserId: string,
  namaProduk: string,
  gambarUrl?: string | null
) {
  const supabase = await createClient();

  // 1. Delete image from Supabase Storage if exists
  if (gambarUrl) {
    try {
      const urlObj = new URL(gambarUrl);
      const pathSegments = urlObj.pathname.split('/');
      // Assuming URL format like https://.../storage/v1/object/public/products/filename.jpg
      const bucketIndex = pathSegments.indexOf('public');
      if (bucketIndex !== -1 && pathSegments.length > bucketIndex + 2) {
        const bucketName = pathSegments[bucketIndex + 1];
        const filePath = pathSegments.slice(bucketIndex + 2).join('/');
        
        // Only delete if it's in a bucket we manage (e.g. products)
        await supabase.storage.from(bucketName).remove([filePath]);
      }
    } catch (e) {
      console.error('Failed to parse or delete image from storage:', e);
      // We continue even if image deletion fails, to ensure DB is clean
    }
  }

  // 2. Delete product from database
  const { error: deleteError } = await supabase
    .from('produk')
    .delete()
    .eq('id', produkId);

  if (deleteError) {
    console.error('Error deleting product:', deleteError);
    return { success: false, error: 'Gagal menghapus produk dari database.' };
  }

  // 3. Insert notification to the UMKM owner
  const { error: notifError } = await supabase
    .from('notifikasi')
    .insert({
      user_id: umkmUserId,
      pesan: `Produk "${namaProduk}" telah dihapus karena melanggar ketentuan platform.`,
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
