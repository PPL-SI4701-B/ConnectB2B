"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function konfirmasiSelesai(
  transaksiId: number,
  umkmUserId: string,
  industriNama: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  // Verify caller is industri
  const { data: industriData } = await supabase
    .from("industri")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!industriData) {
    return {
      success: false,
      error: "Akun Anda bukan sebagai Industri.",
    };
  }

  // Call the SECURITY DEFINER function in the database
  const { data, error } = await supabase.rpc("konfirmasi_pesanan_selesai", {
    p_transaksi_id: transaksiId,
    p_umkm_user_id: umkmUserId,
    p_industri_nama: industriNama,
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
  revalidatePath("/dashboard-industri/pantau-transaksi");
  revalidatePath("/pantau-transaksi");

  return { success: true };
}
