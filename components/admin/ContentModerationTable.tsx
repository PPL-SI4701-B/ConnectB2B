'use client';

import { useState, useTransition } from 'react';
import { Search, EyeOff, Eye } from 'lucide-react';
import { deactivateProduct, reactivateProduct } from '@/app/actions/admin-actions';
import { useRouter } from 'next/navigation';

export interface AdminProdukItem {
  id: number;
  nama: string;
  kategori: string | null;
  harga: number | null;
  is_active: boolean;
  user_id: string;
  owner_nama: string | null;
}

export default function ContentModerationTable({ products }: { products: AdminProdukItem[] }) {
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = products.filter(p =>
    p.nama?.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_nama?.toLowerCase().includes(search.toLowerCase()) ||
    p.kategori?.toLowerCase().includes(search.toLowerCase())
  );

  const formatRupiah = (angka: number | null) => {
    if (!angka) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const handleDeactivate = (produkId: number) => {
    if (!confirm('Nonaktifkan produk ini? Produk tidak akan tampil di katalog.')) return;
    setLoadingId(produkId);
    startTransition(async () => {
      const result = await deactivateProduct(produkId);
      setLoadingId(null);
      if (!result.success) alert(result.error || 'Gagal menonaktifkan produk.');
      else router.refresh();
    });
  };

  const handleReactivate = (produkId: number) => {
    setLoadingId(produkId);
    startTransition(async () => {
      const result = await reactivateProduct(produkId);
      setLoadingId(null);
      if (!result.success) alert(result.error || 'Gagal mengaktifkan produk.');
      else router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama produk, UMKM, atau kategori..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400"
          />
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} produk</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <th className="px-5 py-3 text-left">Produk</th>
              <th className="px-5 py-3 text-left">UMKM Pemilik</th>
              <th className="px-5 py-3 text-left">Kategori</th>
              <th className="px-5 py-3 text-left">Harga</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                  Tidak ada produk ditemukan.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4 font-semibold text-slate-800">{p.nama}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{p.owner_nama || '—'}</td>
                  <td className="px-5 py-4">
                    {p.kategori ? (
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{p.kategori}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-700 font-medium">{formatRupiah(p.harga)}</td>
                  <td className="px-5 py-4">
                    {p.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                        <Eye className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold">
                        <EyeOff className="w-3 h-3" /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {p.is_active ? (
                      <button
                        onClick={() => handleDeactivate(p.id)}
                        disabled={loadingId === p.id || isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border border-red-200"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        {loadingId === p.id ? 'Memproses...' : 'Nonaktifkan'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(p.id)}
                        disabled={loadingId === p.id || isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {loadingId === p.id ? 'Memproses...' : 'Aktifkan'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
