'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function addToCart(data: { produk_id?: number | null; equipment_id?: number | null; kuantitas: number; umkm_id: number }) {
  if (!Number.isInteger(data.kuantitas) || data.kuantitas < 1) throw new Error('Kuantitas minimal 1');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate min_pembelian for produk
  if (data.produk_id) {
    const { data: produk } = await supabase
      .from('produk')
      .select('min_pembelian')
      .eq('id', data.produk_id)
      .single();
    const minPembelian = (produk as any)?.min_pembelian ?? 1;
    if (data.kuantitas < minPembelian) {
      throw new Error(`Minimum pembelian untuk produk ini adalah ${minPembelian} unit.`);
    }
  }

  if (!user) {
    throw new Error('Anda harus login terlebih dahulu');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userData?.role?.toLowerCase();
  
  let industriId: number | null = null;
  let umkmId: number | null = null;

  if (role === 'industri') {
    const { data: industri } = await supabase
      .from('industri')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!industri) throw new Error('Profil industri Anda belum lengkap.');
    industriId = industri.id;
  } else {
    const { data: umkm } = await supabase
      .from('umkm')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!umkm) throw new Error('Profil UMKM Anda belum lengkap.');
    umkmId = umkm.id;
  }

  // Check if item already exists in cart
  let query = supabase.from('keranjang').select('id, kuantitas');
  if (industriId) query = query.eq('industri_id', industriId);
  if (umkmId) query = query.eq('umkm_id', umkmId);
  
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
        industri_id: industriId,
        umkm_id: umkmId,
        produk_id: data.produk_id || null,
        equipment_id: data.equipment_id || null,
        kuantitas: data.kuantitas,
      } as any);

    if (error) throw error;
  }

  revalidatePath('/keranjang');
  revalidatePath('/pencarian');
  return { success: true };
}

async function assertCartOwnership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, cartId: number) {
  const { data: cartItem } = await supabase
    .from('keranjang')
    .select('industri_id, umkm_id')
    .eq('id', cartId)
    .maybeSingle();

  if (!cartItem) throw new Error('Item keranjang tidak ditemukan');

  const [{ data: industri }, { data: umkm }] = await Promise.all([
    cartItem.industri_id
      ? supabase.from('industri').select('id').eq('user_id', userId).eq('id', cartItem.industri_id).maybeSingle()
      : Promise.resolve({ data: null }),
    cartItem.umkm_id
      ? supabase.from('umkm').select('id').eq('user_id', userId).eq('id', cartItem.umkm_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!industri && !umkm) throw new Error('Unauthorized');
}

export async function updateCartQuantity(cartId: number, kuantitas: number) {
  if (!Number.isInteger(kuantitas) || kuantitas < 1) throw new Error('Kuantitas minimal 1');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  await assertCartOwnership(supabase, user.id, cartId);

  // Enforce min_pembelian — konsisten dengan addToCart agar qty tidak bisa diturunkan di bawah minimum
  const { data: cartItem } = await supabase
    .from('keranjang')
    .select('produk_id')
    .eq('id', cartId)
    .maybeSingle();

  if (cartItem?.produk_id) {
    const { data: produk } = await supabase
      .from('produk')
      .select('min_pembelian')
      .eq('id', cartItem.produk_id)
      .single();
    const minPembelian = (produk as any)?.min_pembelian ?? 1;
    if (kuantitas < minPembelian) {
      throw new Error(`Minimum pembelian untuk produk ini adalah ${minPembelian} unit.`);
    }
  }

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

  await assertCartOwnership(supabase, user.id, cartId);

  const { error } = await supabase
    .from('keranjang')
    .delete()
    .eq('id', cartId);

  if (error) throw error;

  revalidatePath('/keranjang');
  return { success: true };
}

export async function checkoutCart() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: industri } = await supabase
    .from('industri')
    .select('id, nama_perusahaan')
    .eq('user_id', user.id)
    .single();

  if (!industri) throw new Error('Profil industri belum lengkap.');

  // Query cart items from DB — includes produk_id/equipment_id for each item
  const { data: cartItems } = await supabase
    .from('keranjang')
    .select(`
      id, kuantitas, umkm_id, produk_id, equipment_id,
      produk:produk_id(nama),
      equipment:equipment_id(nama)
    `)
    .eq('industri_id', industri.id) as any;

  if (!cartItems?.length) throw new Error('Keranjang kosong');

  // Track notified UMKMs to avoid duplicate notifications
  const notifiedUmkms = new Set<number>();

  // Create one request per cart item — each carries its own produk_id/equipment_id
  for (const item of cartItems) {
    const produk = Array.isArray(item.produk) ? item.produk[0] : item.produk;
    const equip = Array.isArray(item.equipment) ? item.equipment[0] : item.equipment;
    const itemNama = produk?.nama || equip?.nama || 'Item';

    const { error } = await supabase
      .from('request')
      .insert({
        industri_id: industri.id,
        umkm_id: item.umkm_id,
        produk_id: item.produk_id || null,
        equipment_id: item.equipment_id || null,
        kuantitas: Math.max(1, Number(item.kuantitas) || 1),
        pesan: `Permintaan kerja sama: ${itemNama} x${item.kuantitas}`,
        status: 'pending',
      } as any);

    if (error) throw error;

    // Notify each UMKM once even if multiple items
    if (!notifiedUmkms.has(item.umkm_id)) {
      notifiedUmkms.add(item.umkm_id);
      const { data: umkm } = await supabase
        .from('umkm')
        .select('user_id')
        .eq('id', item.umkm_id)
        .single() as any;

      if (umkm?.user_id) {
        await supabase.rpc('kirim_notifikasi', {
          p_target_user_id: umkm.user_id,
          p_pesan: `Anda menerima permintaan kerja sama baru dari ${industri.nama_perusahaan}`,
        });
      }
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
