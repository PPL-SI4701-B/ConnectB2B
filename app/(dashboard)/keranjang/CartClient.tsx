'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, ArrowRight, Package, Wrench, Building2 } from 'lucide-react';
import { updateCartQuantity, removeFromCart, checkoutCart, clearCart } from '@/app/actions/cart-actions';
import { toast } from 'react-hot-toast';
import NotificationBell from '@/components/layout/NotificationBell';

interface CartItem {
  id: number;
  kuantitas: number;
  type: 'produk' | 'equipment';
  item_id: number;
  nama: string;
  harga: number;
  gambar_url: string;
  umkm_id: number;
  umkm_nama: string;
}

export default function CartClient({ initialItems }: { initialItems: CartItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [jenisPermintaan, setJenisPermintaan] = useState('Pesan Maklon (Jasa)');
  const [pesanRequest, setPesanRequest] = useState('');

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka || 0);
  };

  const handleUpdateQuantity = async (id: number, newQty: number) => {
    if (newQty < 1) return;
    
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, kuantitas: newQty } : i));
    
    try {
      await updateCartQuantity(id, newQty);
    } catch (err: any) {
      toast.error('Gagal mengupdate kuantitas');
      // Revert on error - Ideally fetch fresh data, but reloading is safer
      router.refresh();
    }
  };

  const handleRemove = async (id: number) => {
    // Optimistic update
    setItems(prev => prev.filter(i => i.id !== id));
    
    try {
      await removeFromCart(id);
      toast.success('Item dihapus dari keranjang');
    } catch (err: any) {
      toast.error('Gagal menghapus item');
      router.refresh();
    }
  };

  const handleClearCart = async () => {
    setIsClearingCart(true);
    try {
      await clearCart();
      setItems([]);
      toast.success('Keranjang berhasil dikosongkan.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengosongkan keranjang.');
    } finally {
      setIsClearingCart(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!pesanRequest.trim()) {
      toast.error('Spesifikasi atau keterangan wajib diisi');
      return;
    }

    setIsCheckingOut(true);
    try {
      const result = await checkoutCart({ jenisPermintaan, spesifikasi: pesanRequest });
      if (result?.skipped && result.skipped.length > 0) {
        // Sebagian item berhasil, sebagian dilewati (pemilik tanpa profil UMKM valid)
        toast.success('Sebagian request berhasil diajukan!');
        toast.error(
          `${result.skipped.length} item dilewati karena UMKM tidak valid (${result.skipped.join(', ')}). Item tersebut masih di keranjang — silakan hapus.`,
          { duration: 6000 }
        );
        router.refresh();
      } else {
        toast.success('Request berhasil diajukan!');
        setItems([]);
        router.push('/pantau-transaksi');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal melakukan checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const totalHarga = items.reduce((sum, item) => sum + ((item.harga || 0) * item.kuantitas), 0);
  const totalItem = items.reduce((sum, item) => sum + item.kuantitas, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-black pb-12">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">Halaman / Keranjang</div>
          <h1 className="text-3xl font-bold text-gray-900">Keranjang Kolaborasi</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </header>

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <ShoppingCart className="w-12 h-12 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Keranjang Anda Kosong</h2>
          <p className="text-gray-500 mb-8 max-w-md">
            Anda belum menambahkan produk atau alat apa pun ke keranjang. Jelajahi UMKM untuk menemukan partner kolaborasi Anda.
          </p>
          <button 
            onClick={() => router.push('/pencarian')}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            Cari Supplier UMKM
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* List Item Keranjang */}
          <div className="flex-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Item Kolaborasi</h2>
              <p className="text-gray-500 text-sm">Anda memiliki {items.length} jenis item di keranjang.</p>
            </div>

            {/* Peringatan multi-UMKM */}
            {new Set(items.map(i => i.umkm_id)).size > 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-amber-500 text-xl shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="font-bold text-amber-800 text-sm mb-1">Keranjang berisi item dari beberapa UMKM</p>
                  <p className="text-amber-700 text-xs mb-3">
                    Keranjang hanya boleh berisi produk dari <strong>satu UMKM</strong>. Hapus item dari UMKM lain atau kosongkan keranjang untuk melanjutkan.
                  </p>
                  <button
                    onClick={handleClearCart}
                    disabled={isClearingCart}
                    className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    {isClearingCart ? 'Mengosongkan...' : 'Kosongkan Keranjang'}
                  </button>
                </div>
              </div>
            )}

            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col sm:flex-row gap-6 transition-all hover:border-indigo-200 hover:shadow-md">
                <div className="w-full sm:w-32 h-32 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center border border-gray-100">
                  {item.gambar_url ? (
                    <img src={item.gambar_url} alt={item.nama} className="w-full h-full object-cover" />
                  ) : (
                    item.type === 'produk' ? <Package className="w-10 h-10 text-gray-300" /> : <Wrench className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.type === 'produk' ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700'}`}>
                          {item.type === 'produk' ? 'Produk' : 'Alat/Mesin'}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{item.umkm_nama}</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">{item.nama}</h3>
                      <p className="text-lg font-extrabold text-indigo-600 mb-4">
                        {formatRupiah(item.harga)}
                        {item.type === 'equipment' && <span className="text-sm text-gray-400 font-medium"> / hari</span>}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="mt-auto flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">Kuantitas:</span>
                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, item.kuantitas - 1)}
                        className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors rounded-l-lg font-bold"
                      >-</button>
                      <input 
                        type="number"
                        value={item.kuantitas}
                        onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-14 h-10 text-center bg-transparent font-bold text-gray-900 border-none focus:ring-0 text-sm"
                        min="1"
                      />
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, item.kuantitas + 1)}
                        className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors rounded-r-lg font-bold"
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ringkasan */}
          <div className="w-full lg:w-[380px] shrink-0">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 lg:sticky lg:top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Ringkasan Request</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Total Item</span>
                  <span className="font-medium text-gray-900">{totalItem}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Total Harga Estimasi</span>
                  <span className="font-medium text-gray-900">{formatRupiah(totalHarga)}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-6 mb-6">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Permintaan <span className="text-rose-500">*</span></label>
                  <select
                    value={jenisPermintaan}
                    onChange={(e) => setJenisPermintaan(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="Pesan Maklon (Jasa)">Pesan Maklon (Jasa)</option>
                    <option value="Pembelian Grosir">Pembelian Grosir</option>
                    <option value="Sewa Alat">Sewa Alat</option>
                    <option value="Kolaborasi Proyek">Kolaborasi Proyek</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Spesifikasi / Keterangan <span className="text-rose-500">*</span></label>
                  <textarea
                    value={pesanRequest}
                    onChange={(e) => setPesanRequest(e.target.value)}
                    placeholder="Detail: target waktu, spesifikasi, durasi..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white resize-none"
                    rows={3}
                    required
                  />
                </div>
                <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl text-sm leading-relaxed border border-indigo-100">
                  <strong>Penting:</strong> Harga di atas adalah estimasi dasar. Kesepakatan harga akhir akan ditentukan setelah Anda berdiskusi dengan UMKM melalui fitur chat/transaksi.
                </div>
              </div>
              
              <button 
                onClick={handleCheckout}
                disabled={isCheckingOut || items.length === 0}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 hover:shadow-md hover:shadow-indigo-200"
              >
                {isCheckingOut ? (
                  'Memproses...'
                ) : (
                  <>
                    Review & Ajukan Request
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
