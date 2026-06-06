'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, MessageSquare, CheckCircle } from 'lucide-react';
import { addToCart } from '@/app/actions/cart-actions';

interface ProductDetailActionsProps {
  produkId: number;
  umkmId: number;
}

export default function ProductDetailActions({ produkId, umkmId }: ProductDetailActionsProps) {
  const router = useRouter();
  const [isAddingCart, setIsAddingCart] = useState(false);
  const [isAjukan, setIsAjukan] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    setIsAddingCart(true);
    setError(null);
    try {
      await addToCart({ produk_id: produkId, kuantitas: 1, umkm_id: umkmId });
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Gagal menambahkan ke keranjang.');
    } finally {
      setIsAddingCart(false);
    }
  };

  const handleAjukanKerjasama = async () => {
    setIsAjukan(true);
    setError(null);
    try {
      await addToCart({ produk_id: produkId, kuantitas: 1, umkm_id: umkmId });
      router.push('/keranjang');
    } catch (e: any) {
      setError(e.message || 'Gagal memproses permintaan.');
      setIsAjukan(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleAddToCart}
          disabled={isAddingCart || isAjukan}
          className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-3.5 px-6 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all flex items-center justify-center gap-2 group shadow-sm disabled:opacity-60"
        >
          {cartSuccess ? (
            <>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-emerald-600">Ditambahkan!</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              {isAddingCart ? 'Menambahkan...' : 'Tambah ke Keranjang'}
            </>
          )}
        </button>

        <button
          onClick={handleAjukanKerjasama}
          disabled={isAddingCart || isAjukan}
          className="flex-1 bg-blue-600 text-white py-3.5 px-6 rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <MessageSquare className="w-5 h-5" />
          {isAjukan ? 'Memproses...' : 'Ajukan Kerjasama'}
        </button>
      </div>
    </div>
  );
}
