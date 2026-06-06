"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function sendSewaAlatRequest(
  equipmentId: number,
  durasi: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Anda harus login terlebih dahulu." };

  // Verify user is a verified UMKM
  const { data: userData } = await (supabase as any)
    .from("users")
    .select("role, status_verifikasi")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "umkm") {
    return { success: false, error: "Hanya akun UMKM yang dapat mengajukan sewa alat." };
  }

  if (userData.status_verifikasi !== "terverifikasi") {
    return { success: false, error: "Lengkapi verifikasi akun terlebih dahulu." };
  }

  if (!durasi.trim()) {
    return { success: false, error: "Durasi negosiasi harus diisi." };
  }

  // Get requesting UMKM info
  const { data: senderUmkm } = await (supabase as any)
    .from("umkm")
    .select("id, nama_usaha")
    .eq("user_id", user.id)
    .single();

  if (!senderUmkm) return { success: false, error: "Profil UMKM Anda tidak ditemukan." };

  // Get equipment info (equipment links to owner via user_id, not umkm_id)
  const { data: equipment } = await (supabase as any)
    .from("equipment")
    .select("id, nama, user_id")
    .eq("id", equipmentId)
    .single();

  if (!equipment) return { success: false, error: "Alat tidak ditemukan." };

  // Find the UMKM that owns this equipment via the equipment's user_id
  const { data: ownerUmkm } = await (supabase as any)
    .from("umkm")
    .select("id, user_id, nama_usaha")
    .eq("user_id", equipment.user_id)
    .single();

  if (!ownerUmkm) return { success: false, error: "Pemilik alat tidak ditemukan." };

  const ownerUmkmId: number = ownerUmkm.id;
  const ownerUserId: string = ownerUmkm.user_id;

  if (ownerUmkmId === senderUmkm.id) {
    return { success: false, error: "Anda tidak dapat menyewa alat milik sendiri." };
  }

  const pesan = `[Sewa Alat Lintas UMKM] Permintaan sewa untuk alat: ${equipment.nama}. Durasi yang diajukan: ${durasi}. Dari: ${senderUmkm.nama_usaha}`;

  const { error: insertError } = await (supabase as any)
    .from("request")
    .insert({
      industri_id: null,
      sender_umkm_id: senderUmkm.id,
      umkm_id: ownerUmkmId,
      equipment_id: equipmentId,
      pesan,
      status: "pending",
    });

  if (insertError) return { success: false, error: insertError.message };

  if (ownerUserId) {
    await supabase.rpc("kirim_notifikasi", {
      p_target_user_id: ownerUserId,
      p_pesan: `Anda menerima permintaan penyewaan alat (${equipment.nama}) dari ${senderUmkm.nama_usaha}`,
    });
  }

  revalidatePath("/sewa-alat");
  return { success: true };
}
