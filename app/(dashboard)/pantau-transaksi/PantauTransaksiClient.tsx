"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  Package,
  Calendar,
  BadgeDollarSign,
  Loader2,
  ShoppingBag,
  Clock,
  CheckCheck,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { konfirmasiSelesai } from "./actions";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransaksiItem = {
  transaksi_id: number;
  request_id: number;
  req_label: string; // #REQ-XXXX
  progress_status: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  umkm_nama: string;
  umkm_user_id: string;
  umkm_initials: string;
  pesan: string | null; // description from request
  total_value: number | null; // from detail_transaksi or produk harga
  has_ulasan: boolean;
};

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
  const s = status?.toLowerCase();
  if (s === "selesai" || s === "completed") {
    return {
      label: "Pesanan Selesai",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
      icon: <CheckCheck className="w-4 h-4" />,
    };
  }
  if (s === "barang tiba" || s === "tiba") {
    return {
      label: "Barang Telah Tiba di Lokasi Pabrik",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
      icon: <CheckCircle2 className="w-4 h-4" />,
    };
  }
  if (s === "dalam pengiriman" || s === "dikirim") {
    return {
      label: "Dalam Pengiriman",
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-200",
      icon: <ShoppingBag className="w-4 h-4" />,
    };
  }
  if (s === "diproses" || s === "dalam proses") {
    return {
      label: "Sedang Diproses UMKM",
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      border: "border-indigo-200",
      icon: <Clock className="w-4 h-4" />,
    };
  }
  // default: menunggu material
  return {
    label: status || "Menunggu Material",
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    icon: <Package className="w-4 h-4" />,
  };
}

function getListBadge(status: string, tanggal_selesai: string | null) {
  if (tanggal_selesai) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
        Selesai
      </span>
    );
  }
  const s = status?.toLowerCase();
  if (s === "barang tiba" || s === "tiba") {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
        Barang Tiba
      </span>
    );
  }
  if (s === "dalam pengiriman" || s === "dikirim") {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
        Dalam Pengiriman
      </span>
    );
  }
  if (s === "diproses" || s === "dalam proses") {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600">
        Diproses
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
      Menunggu
    </span>
  );
}

// ─── Format Rupiah ────────────────────────────────────────────────────────────

function formatRupiah(val: number | null) {
  if (!val) return "Rp -";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(val);
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function PantauTransaksiClient({
  items,
  industriNama,
}: {
  items: TransaksiItem[];
  industriNama: string;
}) {
  const [selected, setSelected] = useState<TransaksiItem | null>(
    items.length > 0 ? items[0] : null
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const router = useRouter();

  const handleKonfirmasi = () => {
    if (!selected) return;
    setError(null);

    startTransition(async () => {
      const result = await konfirmasiSelesai(
        selected.transaksi_id,
        selected.umkm_user_id,
        industriNama
      );

      if (result.success) {
        setSuccessId(selected.transaksi_id);
        // Redirect to ulasan page after 1.5s
        setTimeout(() => {
          router.push(`/dashboard-industri/ulasan?transaksi_id=${selected.transaksi_id}`);
        }, 1500);
      } else {
        setError(result.error || "Terjadi kesalahan. Silakan coba lagi.");
      }
    });
  };

  const isSelesai = (item: TransaksiItem) =>
    !!item.tanggal_selesai || item.progress_status?.toLowerCase() === "selesai";

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm flex items-center justify-center min-h-[400px] p-10">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#f4f7fe] flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10 text-[#a3aed1]" />
          </div>
          <h3 className="text-lg font-bold text-[#2b3674] mb-2">
            Belum Ada Transaksi Aktif
          </h3>
          <p className="text-[#a3aed1] text-sm">
            Transaksi yang disetujui akan muncul di sini.
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = selected ? getStatusConfig(selected.progress_status) : null;
  const selectedDone = selected ? isSelesai(selected) : false;
  const isCurrentSuccess = selected ? successId === selected.transaksi_id : false;

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* ── Left Panel: List ── */}
      <div className="w-[340px] shrink-0 bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-1 overflow-y-auto">
        <h2 className="text-[18px] font-bold text-[#2b3674] mb-4">
          Daftar Pengajuan Aktif Anda
        </h2>

        <div className="space-y-3">
          {items.map((item) => {
            const isActive = selected?.transaksi_id === item.transaksi_id;
            const done = isSelesai(item);

            return (
              <div
                key={item.transaksi_id}
                onClick={() => {
                  setSelected(item);
                  setError(null);
                  setSuccessId(null);
                }}
                className={`rounded-xl p-4 cursor-pointer transition-all border-2 ${
                  isActive
                    ? "border-[#4318ff] bg-[#f4f7fe]"
                    : "border-transparent bg-[#f4f7fe] hover:border-[#4318ff]/30"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[13px] font-bold text-[#2b3674]">
                    {item.req_label}
                  </span>
                  {getListBadge(item.progress_status, item.tanggal_selesai)}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white text-[#4318ff] font-bold flex items-center justify-center text-sm shadow-sm border border-[#e2e8f0] shrink-0">
                    {item.umkm_initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[14px] text-[#2b3674] truncate">
                      {item.pesan || "Kerja Sama Produk"}
                    </h3>
                    <p className="text-xs text-[#a3aed1] mt-0.5 truncate">
                      Ke: {item.umkm_nama}
                    </p>
                    {done && (
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                        ✓ Selesai
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel: Detail ── */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col overflow-y-auto">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#a3aed1]">Pilih transaksi untuk melihat detail.</p>
          </div>
        ) : (
          <>
            {/* Status bar */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold w-fit mb-4 border ${statusConfig?.bg} ${statusConfig?.text} ${statusConfig?.border}`}
            >
              {statusConfig?.icon}
              <span>Status: {statusConfig?.label}</span>
            </div>

            <h2 className="text-[24px] font-bold text-[#2b3674] mb-6">
              Detail {selected.req_label}
            </h2>

            {/* Confirmation info box */}
            {!selectedDone && !isCurrentSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 flex gap-3 items-start">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-700 mb-1 text-sm">
                    Konfirmasi Pesanan Selesai (FR-16)
                  </h4>
                  <p className="text-[13px] text-[#2b3674] font-medium leading-relaxed">
                    {selected.umkm_nama} mengabarkan bahwa pesanan telah
                    dikirimkan ke pabrik Anda. Mohon cek kondisi fisik secara
                    nyata, dan jika Anda puas, konfirmasi bahwa pekerjaan ini
                    Selesai.
                  </p>
                </div>
              </div>
            )}

            {/* Success banner */}
            {isCurrentSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 mb-6 flex gap-3 items-start">
                <CheckCheck className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-700 mb-1">
                    Pesanan Berhasil Dikonfirmasi!
                  </h4>
                  <p className="text-sm text-emerald-700">
                    Anda akan diarahkan ke halaman ulasan...
                  </p>
                </div>
              </div>
            )}

            {/* Already done banner */}
            {selectedDone && !isCurrentSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 flex gap-3 items-center">
                <CheckCheck className="w-7 h-7 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-700">
                    Pesanan ini sudah selesai
                  </h4>
                  <p className="text-sm text-emerald-600">
                    Diselesaikan pada{" "}
                    {selected.tanggal_selesai
                      ? new Date(selected.tanggal_selesai).toLocaleDateString(
                          "id-ID",
                          { day: "2-digit", month: "long", year: "numeric" }
                        )
                      : "-"}
                  </p>
                </div>
              </div>
            )}

            {/* Detail rows */}
            <div className="space-y-0 mb-6">
              <div className="flex justify-between items-center py-4 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2 text-[#a3aed1] font-semibold text-sm">
                  <Package className="w-4 h-4" />
                  Pemasok Utama
                </div>
                <span className="font-bold text-[#2b3674] text-sm">
                  {selected.umkm_nama}
                </span>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2 text-[#a3aed1] font-semibold text-sm">
                  <Calendar className="w-4 h-4" />
                  Tanggal Mulai
                </div>
                <span className="font-bold text-[#2b3674] text-sm">
                  {new Date(selected.tanggal_mulai).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {selected.tanggal_selesai && (
                <div className="flex justify-between items-center py-4 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-2 text-[#a3aed1] font-semibold text-sm">
                    <Calendar className="w-4 h-4" />
                    Tanggal Selesai
                  </div>
                  <span className="font-bold text-emerald-600 text-sm">
                    {new Date(selected.tanggal_selesai).toLocaleDateString(
                      "id-ID",
                      { day: "2-digit", month: "long", year: "numeric" }
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2 text-[#a3aed1] font-semibold text-sm">
                  <BadgeDollarSign className="w-4 h-4" />
                  Total Kesepakatan Lumpsum
                </div>
                <span className="font-bold text-[#2b3674] text-lg">
                  {formatRupiah(selected.total_value)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#e2e8f0] mb-6" />

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-4 text-rose-600 text-sm font-medium">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Action Buttons */}
            {!selectedDone && !isCurrentSuccess ? (
              <div className="flex gap-4 mt-auto">
                <button
                  type="button"
                  onClick={() => alert("Fitur komplain akan segera hadir.")}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-[#e2e8f0] rounded-xl px-5 py-3.5 font-bold text-[#a3aed1] hover:bg-[#f4f7fe] hover:border-[#a3aed1] transition-all text-sm"
                  disabled={isPending}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Ajukan Komplain
                </button>

                <button
                  id="btn-konfirmasi-selesai"
                  type="button"
                  onClick={handleKonfirmasi}
                  disabled={isPending}
                  className="flex-[2] flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl px-5 py-3.5 font-bold transition-all text-sm shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      Pesanan Sesuai &amp; Selesai
                    </>
                  )}
                </button>
              </div>
            ) : selectedDone && !isCurrentSuccess ? (
              <div className="mt-auto">
                <a
                  href={`/dashboard-industri/ulasan?transaksi_id=${selected.transaksi_id}`}
                  className="w-full flex items-center justify-center gap-2 bg-[#4318ff] hover:bg-[#3311dd] text-white rounded-xl px-5 py-3.5 font-bold transition-all text-sm shadow-sm"
                >
                  {selected.has_ulasan ? "Lihat Ulasan" : "Beri Ulasan"}
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
