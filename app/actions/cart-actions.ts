'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function addToCart(data: { produk_id?: number | null; equipment_id?: number | null; kuantitas: number; umkm_id: number }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Anda harus login terlebih dahulu');
  }

  const { data: industri } = await supabase
    .from('industri')
    .select('id, nama_perusahaan')
    .eq('user_id', user.id)
    .single();

  if (!industri) {
    throw new Error('Profil industri Anda belum lengkap.');
  }

  // Check if item already exists in cart for this industri
  let query = supabase.from('keranjang').select('id, kuantitas').eq('industri_id', industri.id);
  
  if (data.produk_id) {
    query = query.eq('produk_id', data.produk_id);
  } else if (data.equipment_id) {
    query = query.eq('equipment_id', data.equipment_id);
  } else {
    throw new Error('Item harus berupa produk atau alat');
  }

  const { data: existingCart } = await query.maybeSingle();

  if (existingCart) {
    // Update quantity
    const { error } = await supabase
      .from('keranjang')
      .update({ kuantitas: existingCart.kuantitas + data.kuantitas })
      .eq('id', existingCart.id);

    if (error) throw error;
  } else {
    // Insert new item
    const { error } = await supabase
      .from('keranjang')
      .insert({
        industri_id: industri.id,
        produk_id: data.produk_id || null,
        equipment_id: data.equipment_id || null,
        kuantitas: data.kuantitas,
        // We will store umkm_id implicitly through the product/equipment, but let's just make sure we don't need umkm_id in keranjang. 
        // Based on the user prompt: keranjang (id, industri_id, produk_id, equipment_id, kuantitas)
      });

    if (error) throw error;
  }

  revalidatePath('/keranjang');
  revalidatePath('/pencarian');
  return { success: true };
}

export async function updateCartQuantity(cartId: number, kuantitas: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('keranjang')
    .update({ kuantitas })
    .eq('id', cartId);

  if (error) throw error;
  
  revalidatePath('/keranjang');
  return { success: true };
}

export async function removeFromCart(cartId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('keranjang')
    .delete()
    .eq('id', cartId);

  if (error) throw error;
  
  revalidatePath('/keranjang');
  return { success: true };
}

export async function checkoutCart(requests: { umkm_id: number; pesan: string }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: industri } = await supabase
    .from('industri')
    .select('id, nama_perusahaan')
    .eq('user_id', user.id)
    .single();

  if (!industri) throw new Error('Profil industri belum lengkap.');

  // Create request for each umkm
  for (const req of requests) {
    const { error } = await supabase
      .from('request')
      .insert({
        industri_id: industri.id,
        umkm_id: req.umkm_id,
        pesan: req.pesan,
        status: 'pending'
      } as any);

    if (error) throw error;

    // Fetch UMKM's user_id for notification
    const { data: umkm } = await supabase
      .from('umkm')
      .select('user_id')
      .eq('id', req.umkm_id)
      .single();

    if (umkm?.user_id) {
      await supabase.from('notifikasi').insert({
        user_id: umkm.user_id,
        pesan: `Anda menerima permintaan kerjasama gabungan baru dari ${industri.nama_perusahaan}`,
        status: 'belum dibaca'
      });
    }
  }

  // Clear cart for this industri
  await supabase
    .from('keranjang')
    .delete()
    .eq('industri_id', industri.id);

  revalidatePath('/keranjang');
  return { success: true };
}
