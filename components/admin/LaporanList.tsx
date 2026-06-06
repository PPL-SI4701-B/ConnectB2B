'use client';

import { useState } from 'react';
import { AlertTriangle, Info, Trash2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { hapusKontenAction, abaikanKontenAction } from '@/app/(admin)/admin/tinjauan-konten/actions';

type LaporanItem = {
  id: number;
  katalog_id: number;
  pelapor: string;
  alasan: string;
  severity: 'berat' | 'ringan';
  status: 'pending' | 'dihapus' | 'diabaikan';
  produk: {
    nama: string;
    deskripsi: string | null;
    gambar_url: string | null;
    user_id: string;
    umkm: {
      nama_usaha: string;
    } | null;
  } | null;
};

export default function LaporanList({ laporanData }: { laporanData: LaporanItem[] }) {
  const [items, setItems] = useState<LaporanItem[]>(laporanData);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  const handleHapus = async (item: LaporanItem) => {
    if (!item.produk) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${item.produk.nama}" dari jaringan? Tindakan ini tidak bisa dibatalkan.`)) {
      setIsProcessing(item.id);
      
      const toastId = toast.loading('Menghapus produk...');
      const res = await hapusKontenAction(
        item.id,
        item.katalog_id,
        item.produk.user_id,
        item.produk.nama,
        item.produk.gambar_url
      );
      
      if (res.success) {
        toast.success('Produk berhasil dihapus secara permanen dari database sistem! (Sesuai FR-22)', { id: toastId });
        setItems(prev => prev.filter(i => i.id !== item.id));
      } else {
        toast.error(res.error || 'Terjadi kesalahan.', { id: toastId });
      }
      setIsProcessing(null);
    }
  };

  const handleAbaikan = async (item: LaporanItem) => {
    setIsProcessing(item.id);
    const toastId = toast.loading('Memproses...');
    
    const res = await abaikanKontenAction(item.id);
    
    if (res.success) {
      toast.success('Laporan ditandai telah diselesaikan. Produk tetap tayang di Katalog.', { id: toastId });
      setItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      toast.error(res.error || 'Terjadi kesalahan.', { id: toastId });
    }
    setIsProcessing(null);
  };

  if (items.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
        <p className="text-slate-500 font-medium">Tidak ada antrean laporan saat ini.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
      <h2 className="text-xl font-bold mb-2">Antrean Laporan & Deteksi Sistem</h2>
      <p className="text-slate-500 text-sm mb-6">
        Di bawah ini adalah daftar produk / jasa di Katalog UMKM yang dilaporkan oleh pengguna lain atau terdeteksi oleh sistem melanggar Terms of Service (Produk terlarang, Ilegal, Penipuan, dsb).
      </p>

      <div className="flex flex-col gap-6">
        {items.map((item) => {
          const isBerat = item.severity === 'berat';
          const borderColor = isBerat ? 'border-l-red-500' : 'border-l-amber-500';
          const badgeBg = isBerat ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600';
          const badgeText = isBerat ? 'Pelanggaran Berat: Barang Ilegal / Palsu' : 'Pelanggaran Ringan: Indikasi Spam Teks';
          
          // Fallback UI if produk is deleted or missing somehow
          if (!item.produk) {
            return null;
          }

          const partnerInitial = item.produk.umkm?.nama_usaha ? item.produk.umkm.nama_usaha.substring(0, 2).toUpperCase() : 'NA';

          return (
            <div 
              key={item.id} 
              className={`flex flex-col gap-4 border-l-4 ${borderColor} bg-slate-50/50 p-5 rounded-r-xl shadow-sm transition-all duration-300 ${isProcessing === item.id ? 'opacity-50 pointer-events-none scale-95' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${badgeBg}`}>
                    {isBerat ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                    {badgeText}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800">
                    ID Katalog: #CAT-{item.katalog_id} ({item.produk.nama})
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {item.pelapor.includes('Sistem') || item.pelapor.includes('Bot') ? 'Dideteksi oleh' : 'Dilaporkan oleh'}: {item.pelapor}
                  </p>
                </div>
                
                {/* Logo/Avatar UMKM */}
                <div className={`flex items-center justify-center w-12 h-12 text-sm font-bold rounded-xl ${isBerat ? 'bg-white text-slate-800 border border-slate-200' : 'bg-amber-100 text-amber-700'}`}>
                  {partnerInitial}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-700 font-medium">
                  <strong>Deskripsi Asli UMKM (Tersangka):</strong><br />
                  <span className="text-slate-600 font-normal leading-relaxed mt-2 inline-block">
                    {item.produk.deskripsi || 'Tidak ada deskripsi.'}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  <span className="font-semibold">Alasan Laporan:</span> {item.alasan}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 mt-2">
                {isBerat ? (
                  <>
                    <button 
                      onClick={() => handleHapus(item)}
                      disabled={isProcessing === item.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus Permanen & Blacklist Produk
                    </button>
                    <button 
                      onClick={() => handleAbaikan(item)}
                      disabled={isProcessing === item.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg transition-colors"
                    >
                      Abaikan / Salah Lapor
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleHapus(item)}
                      disabled={isProcessing === item.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Paksa Hapus dari Katalog
                    </button>
                    <button 
                      onClick={() => handleAbaikan(item)}
                      disabled={isProcessing === item.id}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-sm font-bold rounded-lg transition-colors"
                    >
                      <Mail className="w-4 h-4" /> Jangan Hapus, Kirim Teguran
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
