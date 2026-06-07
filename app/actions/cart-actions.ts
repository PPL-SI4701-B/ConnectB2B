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

  // Query cart items. PENTING: keranjang.umkm_id null untuk keranjang Industri
  // (kolom itu menandai pemilik keranjang, bukan pemasok). UMKM pemasok diturunkan
  // dari pemilik produk/alat (produk.user_id / equipment.user_id → umkm).
  const { data: cartItems } = await supabase
    .from('keranjang')
    .select(`
      id, kuantitas, produk_id, equipment_id,
      produk:produk_id(nama, user_id),
      equipment:equipment_id(nama, user_id)
    `)
    .eq('industri_id', industri.id) as any;

  if (!cartItems?.length) throw new Error('Keranjang kosong');

  // Resolve umkm pemasok untuk tiap pemilik (satu query)
  const ownerUserIds = new Set<string>();
  for (const item of cartItems) {
    const produk = Array.isArray(item.produk) ? item.produk[0] : item.produk;
    const equip = Array.isArray(item.equipment) ? item.equipment[0] : item.equipment;
    const ownerUserId = produk?.user_id || equip?.user_id;
    if (ownerUserId) ownerUserIds.add(ownerUserId);
  }

  const umkmByUser: Record<string, { id: number; user_id: string }> = {};
  if (ownerUserIds.size > 0) {
    const { data: umkms } = await supabase
      .from('umkm')
      .select('id, user_id')
      .in('user_id', Array.from(ownerUserIds)) as any;
    (umkms || []).forEach((u: any) => { umkmByUser[u.user_id] = u; });
  }

  const notifiedUmkms = new Set<number>();
  const processedCartIds: number[] = [];
  const skipped: string[] = [];

  for (const item of cartItems) {
    const produk = Array.isArray(item.produk) ? item.produk[0] : item.produk;
    const equip = Array.isArray(item.equipment) ? item.equipment[0] : item.equipment;
    const itemNama = produk?.nama || equip?.nama || 'Item';
    const ownerUserId = produk?.user_id || equip?.user_id;
    const supplier = ownerUserId ? umkmByUser[ownerUserId] : null;

    // Lewati item yang pemiliknya tidak punya profil UMKM (request tidak bisa dibuat)
    if (!supplier) {
      skipped.push(itemNama);
      continue;
    }

    const { error } = await supabase
      .from('request')
      .insert({
        industri_id: industri.id,
        umkm_id: supplier.id,
        produk_id: item.produk_id || null,
        equipment_id: item.equipment_id || null,
        kuantitas: Math.max(1, Number(item.kuantitas) || 1),
        pesan: `Permintaan kerja sama: ${itemNama} x${item.kuantitas}`,
        status: 'pending',
      } as any);

    if (error) throw error;
    processedCartIds.push(item.id);

    if (!notifiedUmkms.has(supplier.id)) {
      notifiedUmkms.add(supplier.id);
      if (supplier.user_id) {
        await supabase.rpc('kirim_notifikasi', {
          p_target_user_id: supplier.user_id,
          p_pesan: `Anda menerima permintaan kerja sama baru dari ${industri.nama_perusahaan}`,
        });
      }
    }
  }

  if (processedCartIds.length === 0) {
    throw new Error(
      'Tidak ada item yang bisa diajukan. Item di keranjang milik akun tanpa profil UMKM yang valid. Silakan hapus item tersebut.'
    );
  }

  // Hapus hanya item yang berhasil diproses (item yang dilewati tetap di keranjang)
  await supabase
    .from('keranjang')
    .delete()
    .in('id', processedCartIds);

  revalidatePath('/keranjang');
  return { success: true, skipped };
}
