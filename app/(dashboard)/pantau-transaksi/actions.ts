"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createPembayaran(
  transaksiId: number,
  buktiBayarPath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Anda harus login terlebih dahulu." };

  const { data: industri } = await supabase
    .from("industri")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!industri) return { success: false, error: "Profil industri tidak ditemukan." };

  const { data: transaksi } = await supabase
    .from("transaksi")
    .select("id, request:request_id(industri_id)")
    .eq("id", transaksiId)
    .maybeSingle() as any;

  const req = Array.isArray(transaksi?.request) ? transaksi.request[0] : transaksi?.request;
  if (!transaksi || req?.industri_id !== industri.id) {
    return { success: false, error: "Anda tidak memiliki akses ke transaksi ini." };
  }

  const { data: existing } = await supabase
    .from("pembayaran")
    .select("id, status")
    .eq("transaksi_id", transaksiId)
    .maybeSingle() as any;

  if (existing && existing.status !== "gagal") {
    return { success: false, error: "Bukti pembayaran sudah pernah diupload untuk transaksi ini." };
  }

  let dbError: any;
  if (existing && existing.status === "gagal") {
    // Re-upload setelah ditolak: update record yang ada
    const { error } = await supabase
      .from("pembayaran")
      .update({
        bukti_transfer: buktiBayarPath,
        status: "pending",
        tanggal_bayar: new Date().toISOString(),
      } as any)
      .eq("id", existing.id);
    dbError = error;
  } else {
    const { error } = await supabase
      .from("pembayaran")
      .insert({
        transaksi_id: transaksiId,
        bukti_transfer: buktiBayarPath,
        status: "pending",
        tanggal_bayar: new Date().toISOString(),
      } as any);
    dbError = error;
  }

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/pantau-transaksi");
  revalidatePath("/admin");
  return { success: true };
}

export async function konfirmasiSelesai(
  transaksiId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  // RPC melakukan verifikasi ownership & derive semua params dari DB
  const { data, error } = await supabase.rpc("konfirmasi_pesanan_selesai", {
    p_transaksi_id: transaksiId,
  });

  if (error) {
    console.error("[konfirmasiSelesai] RPC error:", error);
    return {
      success: false,
      error: "Gagal mengkonfirmasi pesanan: " + error.message,
    };
  }

  const result = data as { success: boolean; error?: string } | null;

  if (!result?.success) {
    return {
      success: false,
      error: result?.error || "Operasi gagal di sisi server.",
    };
  }

  // Revalidate the page
  revalidatePath("/pantau-transaksi");

  return { success: true };
}
