import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import NotificationBell from "@/components/layout/NotificationBell";
import PantauTransaksiClient, { TransaksiItem } from "./PantauTransaksiClient";

export const metadata = {
  title: "Pembelian & Kerja Sama | ConnectB2B Industri",
  description:
    "Pantau status transaksi dan konfirmasi pesanan selesai sebagai Industri.",
};

export default async function PantauTransaksiPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get industri data
  const { data: industriDataRaw } = await supabase
    .from("industri")
    .select("id, nama_perusahaan")
    .eq("user_id", user.id)
    .single();

  const industriData = industriDataRaw as {
    id: number;
    nama_perusahaan: string;
  } | null;

  if (!industriData) {
    redirect("/dashboard");
  }

  const industriId = industriData.id;
  const industriNama = industriData.nama_perusahaan;

  // Fetch all transaksi for this industri (via request)
  const { data: transaksiRaw, error: txError } = await supabase
    .from("transaksi")
    .select(
      `
      id,
      request_id,
      tanggal_mulai,
      tanggal_selesai,
      progress_status,
      status,
      pembayaran (
        id,
        status,
        bukti_transfer
      ),
      request!inner (
        id,
        pesan,
        industri_id,
        umkm_id,
        umkm!inner (
          id,
          nama_usaha,
          user_id
        )
      )
    `
    )
    .eq("request.industri_id", industriId)
    .order("tanggal_mulai", { ascending: false });

  if (txError) {
    console.error("[PantauTransaksi] Error fetching transaksi:", txError);
  }

  const transaksiList = (transaksiRaw as any[]) ?? [];

  // Collect transaksi IDs to check for ulasan
  const transaksiIds = transaksiList.map((t: any) => t.id);

  let ulasanSet = new Set<number>();
  if (transaksiIds.length > 0) {
    const { data: ulasanData } = await supabase
      .from("ulasan")
      .select("transaksi_id")
      .in("transaksi_id", transaksiIds);
    ulasanData?.forEach((u: any) => ulasanSet.add(u.transaksi_id));
  }

  // Fetch admin bank info
  const { data: bankConfigRaw } = await (supabase as any)
    .from('platform_config')
    .select('key, value')
    .in('key', ['bank_nama', 'bank_no_rekening', 'bank_atas_nama']);

  const bankConfig: Record<string, string> = {};
  (bankConfigRaw as any[] || []).forEach((r: any) => { bankConfig[r.key] = r.value; });

  // Build items list
  const items: TransaksiItem[] = transaksiList.map((t: any) => {
    const req = t.request;
    const umkm = req?.umkm;
    const umkmNama: string = umkm?.nama_usaha || "Unknown UMKM";

    const pembayaranArr = Array.isArray(t.pembayaran) ? t.pembayaran : (t.pembayaran ? [t.pembayaran] : []);
    const pembayaran = pembayaranArr[0] ?? null;

    return {
      transaksi_id: t.id,
      request_id: t.request_id,
      req_label: `#REQ-${String(t.request_id).padStart(4, "0")}`,
      progress_status: t.progress_status || "Menunggu Material",
      status_finansial: t.status || "belum lunas",
      pembayaran_status: pembayaran?.status ?? null,
      tanggal_mulai: t.tanggal_mulai,
      tanggal_selesai: t.tanggal_selesai ?? null,
      umkm_nama: umkmNama,
      umkm_user_id: umkm?.user_id || "",
      umkm_initials: umkmNama.substring(0, 2).toUpperCase(),
      pesan: req?.pesan || null,
      total_value: null,
      has_ulasan: ulasanSet.has(t.id),
    };
  });

  return (
    <div className="w-full bg-[#f4f7fe] min-h-screen">
      <div className="p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <div className="text-[14px] font-medium text-[#a3aed1] mb-1">
              Halaman / Pantau Transaksi
            </div>
            <h1 className="text-[32px] font-bold text-[#2b3674]">
              Pembelian &amp; Kerja Sama
            </h1>
          </div>

          <div className="flex items-center gap-5 bg-white px-5 py-2.5 rounded-[30px] shadow-sm">
            <NotificationBell />
            <div className="w-10 h-10 rounded-full bg-[#00b5d8] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {industriNama.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Two-panel layout */}
        <PantauTransaksiClient items={items} adminBank={bankConfig} />
      </div>
    </div>
  );
}
