"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, CheckCheck, Loader2, Send, XCircle } from "lucide-react";
import { submitUlasan } from "./actions";

type TransaksiSelesai = {
  transaksi_id: number;
  req_label: string;
  umkm_nama: string;
  umkm_initials: string;
  tanggal_selesai: string;
  has_ulasan: boolean;
  existing_rating: number | null;
  existing_komentar: string | null;
};

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 disabled:cursor-default"
        >
          <Star
            className={`w-10 h-10 transition-colors ${
              (hover || value) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-[#e2e8f0]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function UlasanIndustriClient({
  items,
  defaultTransaksiId,
}: {
  items: TransaksiSelesai[];
  defaultTransaksiId?: number;
}) {
  const [selected, setSelected] = useState<TransaksiSelesai | null>(
    items.find((i) => i.transaksi_id === defaultTransaksiId) ??
      items.find((i) => !i.has_ulasan) ??
      (items.length > 0 ? items[0] : null)
  );
  const [rating, setRating] = useState(
    selected?.existing_rating ?? 0
  );
  const [komentar, setKomentar] = useState(
    selected?.existing_komentar ?? ""
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const router = useRouter();

  const handleSelect = (item: TransaksiSelesai) => {
    setSelected(item);
    setRating(item.existing_rating ?? 0);
    setKomentar(item.existing_komentar ?? "");
    setError(null);
    setSuccessId(null);
  };

  const handleSubmit = () => {
    if (!selected) return;
    if (rating === 0) {
      setError("Mohon pilih rating bintang terlebih dahulu.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await submitUlasan(selected.transaksi_id, rating, komentar);
      if (result.success) {
        setSuccessId(selected.transaksi_id);
        setTimeout(() => router.push("/dashboard-industri"), 2000);
      } else {
        setError(result.error || "Gagal mengirim ulasan.");
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm flex items-center justify-center min-h-[400px] p-10">
        <div className="text-center">
          <Star className="w-16 h-16 text-[#e2e8f0] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#2b3674] mb-2">
            Belum Ada Pesanan Selesai
          </h3>
          <p className="text-[#a3aed1] text-sm">
            Konfirmasi pesanan selesai terlebih dahulu untuk dapat memberikan ulasan.
          </p>
        </div>
      </div>
    );
  }

  const isCurrentSuccess = selected
    ? successId === selected.transaksi_id
    : false;
  const isAlreadyReviewed = selected?.has_ulasan || false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[550px]">
      {/* Left: List of completed transactions */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-[18px] font-bold text-[#2b3674] mb-5">
          Permintaan Selesai (Butuh Feedback Anda)
        </h2>
        <div className="space-y-3">
          {items.map((item) => {
            const isActive = selected?.transaksi_id === item.transaksi_id;
            return (
              <div
                key={item.transaksi_id}
                onClick={() => handleSelect(item)}
                className={`rounded-xl p-4 cursor-pointer transition-all border-2 ${
                  isActive
                    ? "border-[#00b5d8] bg-[#f0fdfe]"
                    : "border-transparent bg-[#f4f7fe] hover:border-[#00b5d8]/30"
                } ${item.has_ulasan ? "opacity-70" : ""}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[13px] font-bold text-[#2b3674]">
                    {item.req_label}
                  </span>
                  {item.has_ulasan ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                      ✓ Ulasan Terkirim
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                      Belum Diulas
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#fffbdf] text-amber-500 font-bold flex items-center justify-center text-sm shadow-sm border border-amber-100 shrink-0">
                    {item.umkm_initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[14px] text-[#2b3674]">
                      {item.umkm_nama}
                    </h3>
                    <p className="text-xs text-[#a3aed1] mt-0.5">
                      Selesai:{" "}
                      {new Date(item.tanggal_selesai).toLocaleDateString(
                        "id-ID",
                        { day: "2-digit", month: "short", year: "numeric" }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Review form */}
      <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#a3aed1] text-sm">Pilih transaksi di kiri untuk memberi ulasan.</p>
          </div>
        ) : (
          <>
            <h2 className="text-[18px] font-bold text-[#2b3674] mb-2">
              Deskripsikan Kinerja Mitra
            </h2>
            <p className="text-sm text-[#a3aed1] mb-6 font-medium">
              {selected.umkm_nama} · {selected.req_label}
            </p>

            {/* Success banner */}
            {isCurrentSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex gap-3 items-center">
                <CheckCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-700 text-sm">
                    Ulasan berhasil dikirim!
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Kembali ke dashboard...
                  </p>
                </div>
              </div>
            )}

            {/* Already reviewed notice */}
            {isAlreadyReviewed && !isCurrentSuccess && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-blue-700">
                  Anda sudah memberikan ulasan untuk transaksi ini.
                </p>
                {selected.existing_rating && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-5 h-5 ${
                          s <= selected.existing_rating!
                            ? "fill-amber-400 text-amber-400"
                            : "text-[#e2e8f0]"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Star rating */}
            <div className="text-center mb-6">
              <p className="font-semibold text-[#a3aed1] text-sm mb-3">
                Ketepatan Waktu & Kualitas
              </p>
              <StarRating
                value={isAlreadyReviewed ? (selected.existing_rating ?? 0) : rating}
                onChange={isAlreadyReviewed ? () => {} : setRating}
                disabled={isAlreadyReviewed || isPending || isCurrentSuccess}
              />
              {rating > 0 && !isAlreadyReviewed && (
                <p className="text-sm text-amber-500 font-semibold mt-2">
                  {["", "Buruk", "Kurang", "Cukup", "Baik", "Sangat Baik"][rating]}
                </p>
              )}
            </div>

            {/* Comment textarea */}
            <div className="mb-6 flex-1">
              <label className="block text-sm font-semibold text-[#2b3674] mb-2">
                Ulasan Profesional Terbuka
              </label>
              <textarea
                rows={4}
                value={isAlreadyReviewed ? (selected.existing_komentar ?? "") : komentar}
                onChange={(e) => !isAlreadyReviewed && setKomentar(e.target.value)}
                readOnly={isAlreadyReviewed}
                placeholder="Apakah barang yang disuplai sesuai ekspektasi industri Anda? Apakah layanan pengiriman dilakukan tepat waktu?"
                className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#2b3674] placeholder:text-[#a3aed1] focus:outline-none focus:ring-2 focus:ring-[#00b5d8]/30 focus:border-[#00b5d8] resize-none read-only:bg-[#f4f7fe]"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-4 text-rose-600 text-sm font-medium">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit button */}
            {!isAlreadyReviewed && !isCurrentSuccess && (
              <button
                id="btn-submit-ulasan"
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-[#00b5d8] hover:bg-[#009ab8] text-white rounded-xl px-5 py-3.5 font-bold transition-all text-sm shadow-sm disabled:opacity-70 disabled:cursor-not-allowed mt-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim untuk Ditampilkan di Platform
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
