'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertOctagon, CheckCircle, ShieldAlert, Trash2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type Laporan = {
  id: number;
  katalog_type: string;
  katalog_id: number;
  pelapor: string;
  alasan: string;
  severity: string;
  status: string;
};

export default function ModerationQueuePreview({ laporanList }: { laporanList: Laporan[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAction = async (id: number, action: 'dihapus' | 'diabaikan') => {
    setLoadingId(id);
    try {
      // Panggil aksi supabase langsung untuk mengubah status laporan
      const { error } = await supabase
        .from('laporan_konten')
        .update({ status: action })
        .eq('id', id);

      if (!error) {
        // Jika dihapus, secara ideal kita juga menghapus/menyembunyikan katalog, 
        // tapi untuk FR-20 ini cukup mengubah status laporan.
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Antrean Moderasi Katalog</h2>
          <p className="text-sm text-slate-500">Pratinjau laporan dari sistem & pengguna</p>
        </div>
        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
          {laporanList.length} Menunggu
        </span>
      </div>

      <div className="space-y-4">
        {laporanList.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Tidak ada antrean moderasi.</p>
          </div>
        ) : (
          laporanList.slice(0, 3).map((laporan) => (
            <div key={laporan.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${laporan.severity === 'berat' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    {laporan.severity === 'berat' ? <AlertOctagon className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {laporan.severity === 'berat' ? 'Barang Ilegal / Palsu Ditandai' : 'Spam Deskripsi Jasa'}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">ID Katalog: #{laporan.katalog_id} ({laporan.katalog_type})</p>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{laporan.alasan}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleAction(laporan.id, 'dihapus')}
                  disabled={loadingId === laporan.id}
                  className="flex-1 inline-flex justify-center items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Hapus Konten
                </button>
                <button
                  onClick={() => handleAction(laporan.id, 'diabaikan')}
                  disabled={loadingId === laporan.id}
                  className="flex-1 inline-flex justify-center items-center px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Abaikan
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <Link
          href="/admin/tinjauan-konten"
          className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl transition-colors group"
        >
          Buka Panel Moderasi
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
