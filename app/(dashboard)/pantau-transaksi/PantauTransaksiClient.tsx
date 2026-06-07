"use client";

import { useRef, useState, useTransition } from "react";
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
  UploadCloud,
  FileText,
  Banknote,
  MessageSquareWarning,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { konfirmasiSelesai, createPembayaran, ajukanKomplain } from "./actions";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransaksiItem = {
  transaksi_id: number;
  request_id: number;
  req_label: string;
  progress_status: string;
  status_finansial: string;
  pembayaran_status: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  umkm_nama: string;
  umkm_user_id: string;
  umkm_initials: string;
  pesan: string | null;
  total_value: number | null;
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
  if (val === null || val === undefined) return "Belum ada data";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(val);
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function PantauTransaksiClient({
  items,
  adminBank,
}: {
  items: TransaksiItem[];
  adminBank: Record<string, string>;
}) {
  const [confirmedIds, setConfirmedIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<TransaksiItem | null>(
    items.length > 0 ? items[0] : null
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const router = useRouter();

  // Upload bukti transfer state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedTxIds, setUploadedTxIds] = useState<Set<number>>(new Set());
  const [jumlahTransfer, setJumlahTransfer] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FR-16: komplain
  const [komplainOpen, setKomplainOpen] = useState(false);
  const [komplainPesan, setKomplainPesan] = useState("");
  const [isKomplaining, setIsKomplaining] = useState(false);
  const [komplainDoneIds, setKomplainDoneIds] = useState<Set<number>>(new Set());

  const handleUploadBukti = async () => {
    if (!uploadFile || !selected) return;
    // FR-28: validasi nominal transfer
    const nominal = parseInt(jumlahTransfer.replace(/[^\d]/g, ""), 10);
    if (!nominal || nominal <= 0) {
      setUploadError("Masukkan nominal transfer yang valid (lebih dari 0).");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Silakan login kembali.");

      const ext = uploadFile.name.split(".").pop() || "pdf";
      const filePath = `${user.id}/${selected.transaksi_id}_${Date.now()}.${ext}`;

      const { data: uploadData, error: storageError } = await supabase.storage
        .from("bukti-transfer")
        .upload(filePath, uploadFile, { upsert: false });

      if (storageError) throw new Error(storageError.message);

      const result = await createPembayaran(selected.transaksi_id, uploadData.path, nominal);
      if (!result.success) throw new Error(result.error);

      setUploadedTxIds((prev) => new Set(prev).add(selected.transaksi_id));
      setUploadFile(null);
      setJumlahTransfer("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err: any) {
      setUploadError(err.message || "Gagal mengunggah bukti transfer.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKomplain = async () => {
    if (!selected) return;
    if (!komplainPesan.trim()) return;
    setIsKomplaining(true);
    try {
      const result = await ajukanKomplain(selected.transaksi_id, komplainPesan.trim());
      if (!result.success) {
        setError(result.error || "Gagal mengirim komplain.");
        return;
      }
      setKomplainDoneIds((prev) => new Set(prev).add(selected.transaksi_id));
      setKomplainOpen(false);
      setKomplainPesan("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal mengirim komplain.");
    } finally {
      setIsKomplaining(false);
    }
  };

  const handleKonfirmasi = () => {
    if (!selected) return;
    setError(null);

    const transaksiId = selected.transaksi_id;
    startTransition(async () => {
      const result = await konfirmasiSelesai(transaksiId);

      if (result.success) {
        setConfirmedIds(prev => new Set(prev).add(transaksiId));
        setSuccessId(transaksiId);
        setTimeout(() => {
          router.push(`/dashboard-industri/ulasan?transaksi_id=${transaksiId}`);
        }, 1500);
      } else {
        setError(result.error || "Terjadi kesalahan. Silakan coba lagi.");
      }
    });
  };

  const renderUploadForm = () => (
    <div className="space-y-2">
      {uploadError && (
        <p className="text-xs text-rose-600 font-medium">{uploadError}</p>
      )}
      {/* FR-28: nominal transfer */}
      <div>
        <label className="text-xs font-semibold text-[#2b3674] mb-1 block">Nominal Transfer (Rp)</label>
        <div className="flex items-center bg-white border border-[#c3d0e5] rounded-xl px-3 focus-within:border-[#4318ff] transition-colors">
          <span className="text-sm font-bold text-[#a3aed1]">Rp</span>
          <input
            type="text"
            inputMode="numeric"
            value={jumlahTransfer ? Number(jumlahTransfer.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
            onChange={(e) => setJumlahTransfer(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            className="flex-1 py-2.5 px-2 bg-transparent text-sm font-bold text-[#2b3674] outline-none"
          />
        </div>
      </div>
      <label className="flex items-center gap-3 p-3 bg-white border-2 border-dashed border-[#c3d0e5] rounded-xl cursor-pointer hover:border-[#4318ff] transition-colors group">
        <UploadCloud className="w-5 h-5 text-[#a3aed1] group-hover:text-[#4318ff] shrink-0 transition-colors" />
        <div className="flex-1 min-w-0">
          {uploadFile ? (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4318ff] shrink-0" />
              <span className="text-xs font-semibold text-[#2b3674] truncate">{uploadFile.name}</span>
            </div>
          ) : (
            <span className="text-xs text-[#a3aed1]">Klik untuk pilih file (PDF/JPG/PNG, maks 5MB)</span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) {
              setUploadError("Ukuran file maksimal 5MB.");
              return;
            }
            setUploadError(null);
            setUploadFile(f);
          }}
        />
      </label>
      <button
        type="button"
        disabled={!uploadFile || !jumlahTransfer || isUploading}
        onClick={handleUploadBukti}
        className="w-full flex items-center justify-center gap-2 bg-[#4318ff] hover:bg-[#3311dd] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-bold transition-all"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...</>
        ) : (
          <><UploadCloud className="w-4 h-4" /> Kirim Bukti Transfer</>
        )}
      </button>
    </div>
  );

  const isSelesai = (item: TransaksiItem) =>
    confirmedIds.has(item.transaksi_id) ||
    !!item.tanggal_selesai ||
    item.progress_status?.toLowerCase() === "selesai";

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

            {/* ── Bukti Transfer Section (FR-28) ── */}
            {(() => {
              const isLunas = selected.status_finansial === "lunas";
              const pembayaranStatus = uploadedTxIds.has(selected.transaksi_id)
                ? "pending"
                : selected.pembayaran_status;

              if (isLunas) {
                return (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                    <Banknote className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-700 text-sm">Pembayaran Terverifikasi</p>
                      <p className="text-xs text-emerald-600">Admin telah memvalidasi pembayaran Anda.</p>
                    </div>
                  </div>
                );
              }

              if (pembayaranStatus === "pending") {
                return (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold text-amber-700 text-sm">Bukti Transfer Dikirim</p>
                      <p className="text-xs text-amber-600">Menunggu validasi oleh Admin ConnectB2B.</p>
                    </div>
                  </div>
                );
              }

              if (pembayaranStatus === "gagal") {
                return (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                        <p className="font-bold text-rose-700 text-sm">Bukti Transfer Ditolak</p>
                        <p className="text-xs text-rose-600">Silakan upload ulang bukti yang valid.</p>
                      </div>
                    </div>
                    {renderUploadForm()}
                  </div>
                );
              }

              // null — belum pernah upload
              return (
                <div className="bg-[#f4f7fe] border border-[#e2e8f0] rounded-xl p-4 mb-6 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className="w-4 h-4 text-[#4318ff]" />
                    <p className="font-bold text-[#2b3674] text-sm">Lakukan Pembayaran ke Rekening Admin</p>
                  </div>

                  {/* Info rekening admin */}
                  <div className="bg-white border border-[#c3d0e5] rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-[#a3aed1] uppercase tracking-wide">Rekening Tujuan Transfer</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#a3aed1]">Bank</span>
                      <span className="text-sm font-bold text-[#2b3674]">{adminBank.bank_nama || 'BCA'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#a3aed1]">Nomor Rekening</span>
                      <span className="text-sm font-bold text-[#4318ff] tracking-widest">{adminBank.bank_no_rekening || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#a3aed1]">Atas Nama</span>
                      <span className="text-sm font-bold text-[#2b3674]">{adminBank.bank_atas_nama || '-'}</span>
                    </div>
                    <p className="text-xs text-amber-600 font-medium pt-1 border-t border-[#e2e8f0] mt-1">
                      Transfer sesuai nilai kesepakatan, lalu upload bukti di bawah.
                    </p>
                  </div>

                  <p className="text-xs text-[#a3aed1]">
                    Upload bukti pembayaran (PDF/JPG/PNG, maks 5MB) agar Admin dapat memvalidasi transaksi ini.
                  </p>
                  {renderUploadForm()}
                </div>
              );
            })()}

            {/* Divider */}
            <div className="h-px bg-[#e2e8f0] mb-6" />

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-4 text-rose-600 text-sm font-medium">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Konfirmasi Selesai + Ajukan Komplain (FR-16) */}
            {!selectedDone && !isCurrentSuccess && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleKonfirmasi}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm shadow-emerald-200"
                >
                  {isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> Konfirmasi Pesanan Selesai</>
                  )}
                </button>
                <button
                  onClick={() => { setKomplainOpen(true); setError(null); }}
                  className="sm:w-auto flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-3.5 px-6 rounded-xl transition-all"
                >
                  <MessageSquareWarning className="w-5 h-5" /> Ajukan Komplain
                </button>
              </div>
            )}

            {komplainDoneIds.has(selected.transaksi_id) && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mt-3">
                <MessageSquareWarning className="w-4 h-4 text-rose-500 shrink-0" />
                <p className="text-sm text-rose-600 font-medium">Komplain Anda sudah dikirim ke UMKM &amp; Admin.</p>
              </div>
            )}

            {/* Ulasan link */}
            {selectedDone && !isCurrentSuccess && !selected.has_ulasan && (
              <a
                href={`/dashboard-industri/ulasan?transaksi_id=${selected.transaksi_id}`}
                className="w-full flex items-center justify-center gap-2 bg-[#4318ff] hover:bg-[#3311dd] text-white font-bold py-3.5 px-6 rounded-xl transition-all mt-2"
              >
                Beri Ulasan untuk {selected.umkm_nama} <ChevronRight className="w-5 h-5" />
              </a>
            )}

            {selectedDone && selected.has_ulasan && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mt-2">
                <CheckCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-500 font-medium">Ulasan sudah diberikan.</p>
              </div>
            )}

            {/* Warning jika belum bayar */}
            {!selectedDone && !selected.pembayaran_status && !uploadedTxIds.has(selected.transaksi_id) && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">
                  Silakan selesaikan pembayaran terlebih dahulu sebelum mengkonfirmasi pesanan.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* FR-16: Modal Ajukan Komplain */}
      {komplainOpen && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isKomplaining && setKomplainOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-[#2b3674]">Ajukan Komplain</h3>
              </div>
              <button onClick={() => setKomplainOpen(false)} disabled={isKomplaining} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 disabled:opacity-50">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500">
                Jelaskan masalah pada <strong className="text-[#2b3674]">{selected.req_label}</strong> (mis. barang tidak sesuai, rusak, atau jumlah kurang). Komplain dikirim ke UMKM dan Admin untuk ditinjau.
              </p>
              <textarea
                value={komplainPesan}
                onChange={(e) => setKomplainPesan(e.target.value)}
                rows={4}
                placeholder="Tuliskan detail keluhan Anda..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none text-[#2b3674]"
              />
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setKomplainOpen(false)}
                  disabled={isKomplaining}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleKomplain}
                  disabled={isKomplaining || !komplainPesan.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isKomplaining ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</> : "Kirim Komplain"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
