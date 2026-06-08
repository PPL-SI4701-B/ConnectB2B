"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function getUmkmAndVerifyOwnership(transaksiId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Anda harus login.", supabase, umkm: null };

  const { data: umkm } = await (supabase as any)
    .from("umkm")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!umkm) return { error: "Profil UMKM tidak ditemukan.", supabase, umkm: null };

  // Verify transaksi belongs to this UMKM via request.umkm_id
  const { data: transaksi } = await (supabase as any)
    .from("transaksi")
    .select("id, request:request_id(umkm_id)")
    .eq("id", transaksiId)
    .maybeSingle();

  const req = Array.isArray(transaksi?.request) ? transaksi.request[0] : transaksi?.request;
  if (!transaksi || req?.umkm_id !== umkm.id) {
    return { error: "Anda tidak memiliki akses ke transaksi ini.", supabase, umkm: null };
  }

  return { error: null, supabase, umkm };
}

export async function uploadBuktiKirimUmkm(
  transaksiId: number,
  buktiPath: string
): Promise<{ success: boolean; error?: string }> {
  const { error, supabase } = await getUmkmAndVerifyOwnership(transaksiId);
  if (error) return { success: false, error };

  const { error: updateError } = await (supabase as any)
    .from("transaksi")
    .update({ bukti_pengiriman_umkm: buktiPath })
    .eq("id", transaksiId);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/dashboard/transaksi");
  revalidatePath("/pantau-transaksi");
  return { success: true };
}

export async function uploadBuktiPengiriman(
  transaksiId: number,
  buktiPath: string
): Promise<{ success: boolean; error?: string }> {
  const { error, supabase } = await getUmkmAndVerifyOwnership(transaksiId);
  if (error) return { success: false, error };

  // Pembayaran record must exist (industri sudah bayar)
  const { data: pembayaran } = await (supabase as any)
    .from("pembayaran")
    .select("id, status, status_pengiriman")
    .eq("transaksi_id", transaksiId)
    .maybeSingle();

  if (!pembayaran) return { success: false, error: "Pembayaran dari Industri belum ada. Tunggu pembayaran masuk terlebih dahulu." };
  if (pembayaran.status !== "berhasil") return { success: false, error: "Pembayaran belum divalidasi oleh Admin." };
  if (pembayaran.status_pengiriman === "dikirim") return { success: false, error: "Bukti pengiriman sudah pernah diupload." };

  const { error: updateError } = await (supabase as any)
    .from("pembayaran")
    .update({ bukti_pengiriman: buktiPath, status_pengiriman: "dikirim" })
    .eq("id", pembayaran.id);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/dashboard/transaksi");
  revalidatePath("/pantau-transaksi");
  revalidatePath("/admin");
  return { success: true };
}

export async function uploadBuktiTerimaUang(
  transaksiId: number,
  buktiPath: string
): Promise<{ success: boolean; error?: string }> {
  const { error, supabase } = await getUmkmAndVerifyOwnership(transaksiId);
  if (error) return { success: false, error };

  const { data: pembayaran } = await (supabase as any)
    .from("pembayaran")
    .select("id, bukti_pembayaran_umkm, status_pencairan, bukti_terima_umkm")
    .eq("transaksi_id", transaksiId)
    .maybeSingle();

  if (!pembayaran) return { success: false, error: "Data pembayaran tidak ditemukan." };
  if (!pembayaran.bukti_pembayaran_umkm) return { success: false, error: "Admin belum mentransfer dana ke rekening Anda." };
  if (pembayaran.bukti_terima_umkm) return { success: false, error: "Bukti penerimaan sudah pernah diupload." };

  const { error: updateError } = await (supabase as any)
    .from("pembayaran")
    .update({ bukti_terima_umkm: buktiPath, status_pencairan: "selesai" })
    .eq("id", pembayaran.id);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/dashboard/transaksi");
  revalidatePath("/admin");
  return { success: true };
}
