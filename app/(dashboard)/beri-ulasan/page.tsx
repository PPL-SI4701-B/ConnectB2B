import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import BeriUlasanClient from "./BeriUlasanClient";
import NotificationBell from "@/components/layout/NotificationBell";

export const metadata = {
  title: "Penilaian untuk UMKM | ConnectB2B",
  description: "Berikan penilaian dan ulasan kinerja kepada mitra UMKM Anda.",
};

type SearchParams = { transaksi_id?: string };

export default async function BeriUlasanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get industri data associated with user
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

  const params = await searchParams;
  const defaultTransaksiId = params?.transaksi_id
    ? parseInt(params.transaksi_id)
    : undefined;

  // Fetch completed transactions for this industri
  const { data: transaksiRaw, error } = await supabase
    .from("transaksi")
    .select(
      `
      id,
      tanggal_selesai,
      request!inner (
        id,
        industri_id,
        pesan,
        produk:produk_id ( nama ),
        equipment:equipment_id ( nama ),
        umkm!request_umkm_id_fkey (
          id,
          nama_usaha
        )
      )
    `
    )
    .eq("request.industri_id", industriData.id)
    .not("tanggal_selesai", "is", null)
    .eq("status", "lunas")
    .order("tanggal_selesai", { ascending: false });

  if (error) {
    console.error("Error fetching transactions for review:", error);
  }

  const transaksiList = (transaksiRaw as any[]) ?? [];
  const transaksiIds = transaksiList.map((t: any) => t.id);

  // Fetch existing ulasan
  let ulasanMap: Record<number, { rating: number; komentar: string | null }> = {};
  if (transaksiIds.length > 0) {
    const { data: ulasanData } = await supabase
      .from("ulasan")
      .select("transaksi_id, rating, komentar")
      .in("transaksi_id", transaksiIds);

    ulasanData?.forEach((u: any) => {
      ulasanMap[u.transaksi_id] = {
        rating: u.rating,
        komentar: u.komentar,
      };
    });
  }

  const items = transaksiList.map((t: any) => {
    const req = t.request;
    const umkm = req?.umkm;
    const umkmNama: string = umkm?.nama_usaha || "Mitra UMKM";
    const existing = ulasanMap[t.id];

    // Determine descriptive message for left panel
    const prodName = req?.produk?.nama;
    const equipName = req?.equipment?.nama;
    let description = req?.pesan || '';
    if (!description && prodName) description = `Suplai ${prodName}`;
    if (!description && equipName) description = `Sewa ${equipName}`;
    if (!description) description = 'Kerja Sama / Pengadaan';

    return {
      transaksi_id: t.id,
      req_label: `#TRX-${String(t.id).padStart(4, "0")}`,
      umkm_nama: umkmNama,
      umkm_initials: umkmNama.substring(0, 2).toUpperCase(),
      tanggal_selesai: t.tanggal_selesai,
      has_ulasan: !!existing,
      existing_rating: existing?.rating ?? null,
      existing_komentar: existing?.komentar ?? null,
      pesan: description,
    };
  });

  return (
    <div className="w-full bg-bg-color min-h-screen">
      <div className="p-8">
        
        {/* Header matching mockup & styling */}
        <header className="flex justify-between items-center mb-8 bg-transparent">
          <div>
            <div className="text-[13px] font-medium text-text-muted mb-1">
              Halaman / Kirim Ulasan
            </div>
            <h1 className="text-[28px] font-bold text-text-main">
              Penilaian untuk UMKM
            </h1>
            <p className="text-text-muted text-[14px] mt-0.5">
              Berikan penilaian rating dan ulasan tertulis atas kepuasan kinerja dan kerja sama mitra Anda.
            </p>
          </div>
          
          <div className="flex items-center gap-5 bg-card-bg px-5 py-2.5 rounded-[30px] shadow-sm border border-border-color shrink-0">
            <NotificationBell />
            <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0">
              {industriData.nama_perusahaan.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Client side split view */}
        <BeriUlasanClient
          items={items}
          defaultTransaksiId={defaultTransaksiId}
        />
      </div>
    </div>
  );
}
