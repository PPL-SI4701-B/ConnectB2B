'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, CheckCircle, Loader2, Send, AlertCircle, X } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import { submitUlasan } from './actions';

type TransaksiSelesai = {
  transaksi_id: number;
  req_label: string;
  umkm_nama: string;
  umkm_initials: string;
  tanggal_selesai: string;
  has_ulasan: boolean;
  existing_rating: number | null;
  existing_komentar: string | null;
  pesan: string;
};

export default function BeriUlasanClient({
  items,
  defaultTransaksiId,
}: {
  items: TransaksiSelesai[];
  defaultTransaksiId?: number;
}) {
  const router = useRouter();
  const [localItems, setLocalItems] = useState<TransaksiSelesai[]>(items);
  
  // Set default selected transaction
  const [selected, setSelected] = useState<TransaksiSelesai | null>(() => {
    if (defaultTransaksiId) {
      const match = localItems.find((i) => i.transaksi_id === defaultTransaksiId);
      if (match) return match;
    }
    // Default to first pending ulasan
    const pending = localItems.find((i) => !i.has_ulasan);
    if (pending) return pending;
    
    // Otherwise, first item or null
    return localItems.length > 0 ? localItems[0] : null;
  });

  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sync state when selected item changes
  useEffect(() => {
    if (selected) {
      setRating(selected.existing_rating ?? 0);
      setKomentar(selected.existing_komentar ?? '');
      setError(null);
      setSuccess(false);
    }
  }, [selected]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelect = (item: TransaksiSelesai) => {
    setSelected(item);
  };

  const handleSubmit = () => {
    if (!selected) return;
    if (rating === 0) {
      setError("Rating wajib diisi.");
      return;
    }
    setError(null);

    const targetId = selected.transaksi_id;
    const ratingValue = rating;
    const komentarValue = komentar;

    startTransition(async () => {
      const result = await submitUlasan(targetId, ratingValue, komentarValue);
      if (result.success) {
        setSuccess(true);
        showToast('Ulasan berhasil dikirim!', 'success');

        // Update local items state
        setLocalItems((prev) =>
          prev.map((item) =>
            item.transaksi_id === targetId
              ? {
                  ...item,
                  has_ulasan: true,
                  existing_rating: ratingValue,
                  existing_komentar: komentarValue,
                }
              : item
          )
        );

        // Update currently selected item attributes
        setSelected((prev) =>
          prev && prev.transaksi_id === targetId
            ? {
                ...prev,
                has_ulasan: true,
                existing_rating: ratingValue,
                existing_komentar: komentarValue,
              }
            : prev
        );

        // Redirect back to list / refresh
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setError(result.error || 'Gagal mengirim ulasan.');
        showToast(result.error || 'Gagal mengirim ulasan.', 'error');
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm flex flex-col items-center justify-center min-h-[400px] p-8 border border-border-color">
        <div className="w-16 h-16 bg-[#f4f7fe] rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-border-color" />
        </div>
        <h3 className="text-lg font-bold text-text-main mb-2">
          Belum Ada Transaksi Selesai
        </h3>
        <p className="text-text-muted text-sm text-center max-w-sm">
          Semua transaksi Anda yang aktif masih dalam proses. Selesaikan transaksi terlebih dahulu di menu Pantau Transaksi untuk memberikan ulasan.
        </p>
      </div>
    );
  }

  const isAlreadyReviewed = selected?.has_ulasan || false;

  return (
    <div className="w-full">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border backdrop-blur-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
              : 'bg-red-50/95 border-red-200 text-red-800'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <p className="text-[14px] font-semibold">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-3 text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid Layout Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[30px] items-start">
        
        {/* PANEL KIRI: LIST TRANSAKSI */}
        <div className="lg:col-span-6 bg-white rounded-xl p-[25px] shadow-sm border border-border-color">
          <h2 className="text-[18px] font-bold text-text-main mb-5">
            Permintaan Selesai (Butuh *Feedback* Anda)
          </h2>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {localItems.map((item) => {
              const isItemActive = selected?.transaksi_id === item.transaksi_id;
              
              return (
                <div
                  key={item.transaksi_id}
                  onClick={() => handleSelect(item)}
                  className={`border rounded-xl p-5 cursor-pointer transition-all ${
                    isItemActive
                      ? 'border-secondary bg-blue-50/20 ring-1 ring-secondary/30'
                      : 'border-border-color hover:border-blue-100 hover:bg-slate-50/30'
                  } ${item.has_ulasan ? 'opacity-70' : ''}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-text-main text-[15px]">
                      {item.req_label}
                    </span>
                    
                    {!item.has_ulasan && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/20">
                        Telah Anda Konfirmasi
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-4">
                    {/* Partner Logo/Initials */}
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-warning font-bold flex items-center justify-center text-sm shadow-sm border border-amber-100 shrink-0">
                      {item.umkm_initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[15px] text-text-main truncate">
                        {item.umkm_nama}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5 truncate">
                        {item.pesan}
                      </p>
                      
                      {item.has_ulasan ? (
                        <span className="text-slate-400 font-semibold text-xs mt-2.5 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                          Ulasan sudah dikirim
                        </span>
                      ) : (
                        <div className="mt-3.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(item);
                            }}
                            className="bg-danger hover:bg-danger/90 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-sm"
                          >
                            Beri Ulasan Sekarang
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL KANAN: FORM REVIEW */}
        <div className="lg:col-span-6 bg-white rounded-xl p-[25px] shadow-sm border border-border-color">
          {selected ? (
            <div className="flex flex-col h-full">
              <h2 className="text-[18px] font-bold text-text-main mb-1.5">
                Deskripsikan Kinerja Mitra {selected.umkm_nama}
              </h2>
              <p className="text-xs text-text-muted mb-6">
                Transaksi: {selected.req_label} · {selected.pesan}
              </p>

              {/* Success Banner */}
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex gap-3 items-center animate-in fade-in duration-300">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-700 text-[14px]">
                      Ulasan berhasil dikirim!
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Terima kasih atas ulasan profesional Anda.
                    </p>
                  </div>
                </div>
              )}

              {/* Already reviewed banner */}
              {isAlreadyReviewed && !success && (
                <div className="bg-slate-50 border border-border-color rounded-xl p-4 mb-6">
                  <p className="text-[13px] font-semibold text-text-main flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    Anda sudah memberikan ulasan untuk transaksi ini.
                  </p>
                </div>
              )}

              {/* Interactive Star Rating */}
              <div className="flex flex-col items-center justify-center bg-slate-50/50 rounded-xl p-6 mb-6 border border-slate-100">
                <p className="font-bold text-text-muted text-sm mb-3.5 uppercase tracking-wide">
                  Ketepatan Waktu & Kualitas
                </p>
                
                <StarRating
                  rating={rating}
                  onChange={setRating}
                  readonly={isAlreadyReviewed || isPending || success}
                  size={36}
                />

                {rating > 0 && (
                  <p className="text-sm font-bold text-warning mt-3">
                    {rating} dari 5 Bintang ({["", "Sangat Buruk", "Kurang Baik", "Cukup", "Sangat Baik", "Sempurna"][rating]})
                  </p>
                )}
              </div>

              {/* Textarea review */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-text-main mb-2">
                  Ulasan Profesional Terbuka
                </label>
                <textarea
                  rows={5}
                  value={komentar}
                  onChange={(e) => setKomentar(e.target.value)}
                  readOnly={isAlreadyReviewed || isPending || success}
                  placeholder="Apakah barang yang disuplai sesuai ekspektasi industri Anda? Apakah layanan pengiriman dilakukan tepat waktu?"
                  className="w-full border border-border-color rounded-xl px-4 py-3 text-[14px] text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all resize-none read-only:bg-slate-50/70 read-only:text-text-muted"
                />
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-800 text-[13px] font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit button */}
              {!isAlreadyReviewed && !success && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/95 text-white font-bold text-[14px] py-3.5 rounded-xl shadow-md disabled:opacity-75 disabled:cursor-not-allowed transition-all mt-auto"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Mengirim Ulasan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 shrink-0" />
                      <span>Kirim untuk Ditampilkan di Platform</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Star className="w-12 h-12 text-border-color mb-3" />
              <p className="text-text-muted text-sm">
                Pilih salah satu transaksi selesai di panel kiri untuk mulai menulis ulasan.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
