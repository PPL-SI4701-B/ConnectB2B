"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createPembayaran(
  transaksiId: number,
  buktiBayarPath: string,
  jumlahTransfer?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Anda harus login terlebih dahulu." };

  // FR-28: nominal transfer wajib diisi dan harus > 0
  if (jumlahTransfer === undefined || jumlahTransfer === null || !(jumlahTransfer > 0)) {
    return { success: false, error: "Nominal transfer harus diisi dan lebih dari 0." };
  }

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
        jumlah_transfer: jumlahTransfer,
        catatan_admin: null,
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
        jumlah_transfer: jumlahTransfer,
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

// FR-16 (skenario alternatif): Industri mengajukan komplain alih-alih konfirmasi selesai
export async function ajukanKomplain(
  transaksiId: number,
  pesan: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Anda harus login terlebih dahulu." };
  if (!pesan.trim()) return { success: false, error: "Detail keluhan tidak boleh kosong." };

  const { data: industri } = await supabase
    .from("industri")
    .select("id, nama_perusahaan")
    .eq("user_id", user.id)
    .maybeSingle() as any;
  if (!industri) return { success: false, error: "Profil industri tidak ditemukan." };

  // Verifikasi kepemilikan transaksi + ambil user_id UMKM
  const { data: trx } = await supabase
    .from("transaksi")
    .select("id, request:request_id(industri_id, umkm:umkm_id(user_id))")
    .eq("id", transaksiId)
    .maybeSingle() as any;

  const req = Array.isArray(trx?.request) ? trx.request[0] : trx?.request;
  if (!trx || req?.industri_id !== industri.id) {
    return { success: false, error: "Anda tidak memiliki akses ke transaksi ini." };
  }

  const trxCode = `TRX-${String(transaksiId).padStart(4, "0")}`;

  const { error: histError } = await supabase
    .from("transaksi_history")
    .insert({
      transaksi_id: transaksiId,
      status_progress: "Komplain Diajukan",
      pesan,
    } as any);

  if (histError) {
    console.error("Gagal mencatat history komplain (diabaikan karena RLS):", histError);
  }

  // Update status progress di transaksi agar UI tahu ini sedang komplain
  const { error: updateErr } = await supabase
    .from("transaksi")
    .update({ progress_status: "Komplain Diajukan" } as any)
    .eq("id", transaksiId);
  
  if (updateErr) {
    console.error("Gagal update progress_status transaksi:", updateErr);
  }

  // Notifikasi ke UMKM
  const umkm = Array.isArray(req?.umkm) ? req.umkm[0] : req?.umkm;
  if (umkm?.user_id) {
    await supabase.rpc("kirim_notifikasi", {
      p_target_user_id: umkm.user_id,
      p_pesan: `Komplain pada ${trxCode} dari ${industri.nama_perusahaan}: "${pesan}"`,
    });
  }

  // Notifikasi ke semua Admin
  const { data: admins } = await supabase.from("users").select("id").eq("role", "admin");
  for (const a of (admins as any[]) || []) {
    await supabase.rpc("kirim_notifikasi", {
      p_target_user_id: a.id,
      p_pesan: `Komplain baru pada ${trxCode} dari ${industri.nama_perusahaan}. Perlu ditinjau.`,
    });
  }

  revalidatePath("/pantau-transaksi");
  return { success: true };
}

export async function konfirmasiPenerimaan(
  transaksiId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Anda harus login terlebih dahulu." };

  const { data: industri } = await supabase
    .from("industri")
    .select("id, nama_perusahaan")
    .eq("user_id", user.id)
    .single();
  if (!industri) return { success: false, error: "Profil industri tidak ditemukan." };

  const { data: trx } = await supabase
    .from("transaksi")
    .select("id, bukti_pengiriman_umkm, request:request_id(industri_id, umkm:umkm_id(user_id))")
    .eq("id", transaksiId)
    .maybeSingle() as any;

  const req = Array.isArray(trx?.request) ? trx.request[0] : trx?.request;
  if (!trx || req?.industri_id !== industri.id) {
    return { success: false, error: "Anda tidak memiliki akses ke transaksi ini." };
  }
  if (!trx.bukti_pengiriman_umkm) {
    return { success: false, error: "UMKM belum mengupload bukti pengiriman." };
  }

  const { error: updateError } = await supabase
    .from("transaksi")
    .update({ konfirmasi_penerimaan: true } as any)
    .eq("id", transaksiId);

  if (updateError) return { success: false, error: updateError.message };

  const umkm = Array.isArray(req?.umkm) ? req.umkm[0] : req?.umkm;
  if (umkm?.user_id) {
    await supabase.rpc("kirim_notifikasi", {
      p_target_user_id: umkm.user_id,
      p_pesan: `${industri.nama_perusahaan} telah mengkonfirmasi penerimaan barang/jasa pada TRX-${String(transaksiId).padStart(4, "0")}. Pembayaran sedang diproses.`,
    });
  }

  revalidatePath("/pantau-transaksi");
  revalidatePath("/dashboard/transaksi");
  return { success: true };
}

export async function batalkanTransaksi(
  transaksiId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Anda harus login terlebih dahulu." };

  const { data: industri } = await supabase
    .from("industri")
    .select("id, nama_perusahaan")
    .eq("user_id", user.id)
    .single();
  if (!industri) return { success: false, error: "Profil industri tidak ditemukan." };

  const { data: trx } = await supabase
    .from("transaksi")
    .select("id, progress_status, request:request_id(industri_id, umkm:umkm_id(user_id))")
    .eq("id", transaksiId)
    .maybeSingle() as any;

  const req = Array.isArray(trx?.request) ? trx.request[0] : trx?.request;
  if (!trx || req?.industri_id !== industri.id) {
    return { success: false, error: "Anda tidak memiliki akses ke transaksi ini." };
  }
  if (trx.progress_status?.toLowerCase() === "dibatalkan") {
    return { success: false, error: "Transaksi sudah dibatalkan sebelumnya." };
  }

  const { error: updateError } = await supabase
    .from("transaksi")
    .update({ progress_status: "Dibatalkan" } as any)
    .eq("id", transaksiId);

  if (updateError) return { success: false, error: updateError.message };

  const umkm = Array.isArray(req?.umkm) ? req.umkm[0] : req?.umkm;
  if (umkm?.user_id) {
    await supabase.rpc("kirim_notifikasi", {
      p_target_user_id: umkm.user_id,
      p_pesan: `Transaksi TRX-${String(transaksiId).padStart(4, "0")} telah dibatalkan oleh ${industri.nama_perusahaan}.`,
    });
  }

  revalidatePath("/pantau-transaksi");
  return { success: true };
}
