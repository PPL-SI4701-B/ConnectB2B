"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function submitUlasan(
  transaksiId: number,
  rating: number,
  komentar: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Anda harus login terlebih dahulu." };
  }

  // Verify the caller is an industri user related to this transaksi
  const { data: industriData } = await supabase
    .from("industri")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!industriData) {
    return { success: false, error: "Akun Anda bukan sebagai Industri." };
  }

  // Validate rating
  if (rating < 1 || rating > 5) {
    return { success: false, error: "Rating harus antara 1 dan 5." };
  }

  // Verify this transaksi belongs to this industri
  const { data: txData, error: txError } = await supabase
    .from("transaksi")
    .select("id, request_id, tanggal_selesai")
    .eq("id", transaksiId)
    .single();

  if (txError || !txData) {
    return { success: false, error: "Transaksi tidak ditemukan." };
  }

  if (!txData.tanggal_selesai) {
    return {
      success: false,
      error: "Pesanan belum dikonfirmasi selesai.",
    };
  }

  const { data: reqData } = await supabase
    .from("request")
    .select("industri_id")
    .eq("id", txData.request_id)
    .single();

  if (!reqData || reqData.industri_id !== industriData.id) {
    return {
      success: false,
      error: "Anda tidak berwenang memberi ulasan untuk transaksi ini.",
    };
  }

  // Check if ulasan already exists
  const { data: existing } = await supabase
    .from("ulasan")
    .select("id")
    .eq("transaksi_id", transaksiId)
    .single();

  if (existing) {
    // Update existing ulasan
    const { error: updateError } = await supabase
      .from("ulasan")
      .update({ rating, komentar: komentar || null })
      .eq("id", existing.id);

    if (updateError) {
      return { success: false, error: "Gagal memperbarui ulasan: " + updateError.message };
    }
  } else {
    // Insert new ulasan
    const { error: insertError } = await supabase.from("ulasan").insert({
      transaksi_id: transaksiId,
      rating,
      komentar: komentar || null,
    });

    if (insertError) {
      return { success: false, error: "Gagal mengirim ulasan: " + insertError.message };
    }
  }

  revalidatePath("/dashboard-industri/ulasan");
  revalidatePath("/pantau-transaksi");

  return { success: true };
}
