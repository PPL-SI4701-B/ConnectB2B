'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, CreditCard, CheckCheck, Clock, Banknote } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { uploadBuktiPembayaranUmkm } from '@/app/actions/admin-actions';

export interface PayoutItem {
  pembayaran_id: number;
  transaksi_id: number;
  umkm_nama: string;
  nama_bank: string | null;
  no_rekening: string | null;
  atas_nama_rekening: string | null;
  bukti_pengiriman: string | null;
  bukti_pembayaran_umkm: string | null;
  status_pencairan: string;
  tanggal_bayar: string;
  industri_nama: string;
}

export default function UmkmPayoutTable({ payouts }: { payouts: PayoutItem[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleUpload = (pembayaranId: number) => {
    if (!uploadFile || activeId !== pembayaranId) return;
    setError(null);
    setLoadingId(pembayaranId);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Silakan login kembali.');
        const ext = uploadFile.name.split('.').pop() || 'pdf';
        const filePath = `${user.id}/${pembayaranId}_${Date.now()}.${ext}`;
        const { data: up, error: storageErr } = await supabase.storage
          .from('bukti-transfer')
          .upload(filePath, uploadFile, { upsert: false });
        if (storageErr) throw new Error(storageErr.message);
        const result = await uploadBuktiPembayaranUmkm(pembayaranId, up.path);
        if (!result.success) throw new Error(result.error);
        setUploadFile(null);
        setActiveId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        router.refresh();
      } catch (e: any) {
        setError(e.message || 'Gagal upload.');
      } finally {
        setLoadingId(null);
      }
    });
  };

  if (payouts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
        <CheckCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Tidak ada pembayaran yang perlu dicairkan saat ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payouts.map(p => (
        <div key={p.pembayaran_id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Info transaksi */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">TRX-{p.transaksi_id.toString().padStart(4, '0')}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">dari {p.industri_nama}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{formatDate(p.tanggal_bayar)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Industri Lunas</span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Barang Terkirim</span>
              </div>
            </div>

            {/* Rekening UMKM */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[240px]">
              <div className="flex items-center gap-1.5 mb-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rekening UMKM</p>
              </div>
              <p className="text-sm font-bold text-slate-800">{p.umkm_nama}</p>
              {p.no_rekening ? (
                <>
                  <p className="text-xs text-slate-500 mt-1">{p.nama_bank} • <span className="font-mono font-bold text-slate-700">{p.no_rekening}</span></p>
                  <p className="text-xs text-slate-500">a.n. {p.atas_nama_rekening}</p>
                </>
              ) : (
                <p className="text-xs text-red-500 mt-1">UMKM belum mengisi data rekening</p>
              )}
            </div>

            {/* Upload bukti bayar */}
            <div className="min-w-[260px]">
              {p.bukti_pembayaran_umkm ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <Banknote className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs font-bold text-emerald-700">Bukti Transfer ke UMKM Sudah Diupload</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" /> Upload Bukti Transfer ke UMKM
                  </p>
                  {error && activeId === p.pembayaran_id && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors text-xs text-slate-500">
                    <FileText className="w-4 h-4 shrink-0" />
                    {uploadFile && activeId === p.pembayaran_id
                      ? uploadFile.name
                      : 'Pilih bukti transfer (PDF/JPG, maks 5MB)'}
                    <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden"
                      ref={activeId === p.pembayaran_id ? fileInputRef : undefined}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f || f.size > 5 * 1024 * 1024) { setError('Maks 5MB.'); return; }
                        setUploadFile(f);
                        setActiveId(p.pembayaran_id);
                        setError(null);
                      }} />
                  </label>
                  <button
                    disabled={!uploadFile || activeId !== p.pembayaran_id || loadingId === p.pembayaran_id || isPending}
                    onClick={() => handleUpload(p.pembayaran_id)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    {loadingId === p.pembayaran_id ? (
                      <><Clock className="w-3.5 h-3.5 animate-spin" /> Mengunggah...</>
                    ) : (
                      <><UploadCloud className="w-3.5 h-3.5" /> Konfirmasi Transfer ke UMKM</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
