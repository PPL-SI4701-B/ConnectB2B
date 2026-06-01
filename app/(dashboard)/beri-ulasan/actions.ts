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

  // Verify the caller is an industri user
  const { data: industriData } = await supabase
    .from("industri")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!industriData) {
    return { success: false, error: "Akun Anda bukan sebagai Industri." };
  }

  // Validate rating (rating is required)
  if (!rating || rating < 1 || rating > 5) {
    return { success: false, error: "Rating wajib diisi (1 sampai 5 bintang)." };
  }

  // Verify this transaksi exists
  const { data: txData, error: txError } = await supabase
    .from("transaksi")
    .select("id, request_id, tanggal_selesai")
    .eq("id", transaksiId)
    .single();

  if (txError || !txData) {
    return { success: false, error: "Transaksi tidak ditemukan." };
  }

  // Verify the transaction is completed (hanya bisa memberi ulasan setelah transaksi selesai)
  if (!txData.tanggal_selesai) {
    return {
      success: false,
      error: "Hanya bisa memberikan ulasan setelah transaksi selesai.",
    };
  }

  // Verify this transaksi belongs to this industri
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
      .update({ 
        rating, 
        komentar: komentar || null,
        tanggal: new Date().toISOString()
      })
      .eq("id", existing.id);

    if (updateError) {
      return { success: false, error: "Gagal memperbarui ulasan: " + updateError.message };
    }
  } else {
    // Insert new ulasan (tanggal = now)
    const { error: insertError } = await supabase.from("ulasan").insert({
      transaksi_id: transaksiId,
      rating,
      komentar: komentar || null,
      tanggal: new Date().toISOString(),
    });

    if (insertError) {
      return { success: false, error: "Gagal mengirim ulasan: " + insertError.message };
    }
  }

  // Revalidate relevant pages
  revalidatePath("/beri-ulasan");
  revalidatePath("/pantau-transaksi");
  revalidatePath("/dashboard-industri");

  return { success: true };
}
