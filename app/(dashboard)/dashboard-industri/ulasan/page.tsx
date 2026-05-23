import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import UlasanIndustriClient from "./UlasanIndustriClient";

export const metadata = {
  title: "Beri Ulasan | ConnectB2B Industri",
  description: "Berikan penilaian dan ulasan kepada mitra UMKM Anda.",
};

type SearchParams = { transaksi_id?: string };

export default async function UlasanIndustriPage({
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

  const params = await searchParams;
  const defaultTransaksiId = params?.transaksi_id
    ? parseInt(params.transaksi_id)
    : undefined;

  // Fetch completed transaksi for this industri
  const { data: transaksiRaw } = await supabase
    .from("transaksi")
    .select(
      `
      id,
      tanggal_selesai,
      request!inner (
        id,
        industri_id,
        umkm!inner (
          id,
          nama_usaha
        )
      )
    `
    )
    .eq("request.industri_id", industriData.id)
    .not("tanggal_selesai", "is", null)
    .order("tanggal_selesai", { ascending: false });

  const transaksiList = (transaksiRaw as any[]) ?? [];
  const transaksiIds = transaksiList.map((t: any) => t.id);

  // Fetch existing ulasan
  let ulasanMap: Record<number, { rating: number; komentar: string | null }> =
    {};
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
    const umkmNama: string = umkm?.nama_usaha || "Unknown UMKM";
    const existing = ulasanMap[t.id];

    return {
      transaksi_id: t.id,
      req_label: `#REQ-${String(req?.id).padStart(4, "0")}`,
      umkm_nama: umkmNama,
      umkm_initials: umkmNama.substring(0, 2).toUpperCase(),
      tanggal_selesai: t.tanggal_selesai,
      has_ulasan: !!existing,
      existing_rating: existing?.rating ?? null,
      existing_komentar: existing?.komentar ?? null,
    };
  });

  return (
    <div className="w-full bg-[#f4f7fe] min-h-screen">
      <div className="p-8">
        {/* Header */}
        <header className="mb-8">
          <div className="text-[14px] font-medium text-[#a3aed1] mb-1">
            Halaman / Kirim Ulasan
          </div>
          <h1 className="text-[32px] font-bold text-[#2b3674]">
            Penilaian untuk UMKM
          </h1>
        </header>

        <UlasanIndustriClient
          items={items}
          defaultTransaksiId={defaultTransaksiId}
        />
      </div>
    </div>
  );
}
