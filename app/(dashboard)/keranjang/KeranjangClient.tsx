'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Trash2, Package, Wrench, Building2, Send } from 'lucide-react';

interface KeranjangItem {
  id: number;
  kuantitas: number;
  type: 'produk' | 'equipment';
  item_id: number;
  nama: string;
  harga: number;
  gambar_url: string;
  umkm_id: number;
  nama_usaha: string;
  umkm_user_id: string;
}

export default function KeranjangClient({ 
  items: initialItems,
  industriId,
  industriName,
  currentUserVerifikasi
}: { 
  items: KeranjangItem[],
  industriId: number,
  industriName: string,
  currentUserVerifikasi: string
}) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<KeranjangItem[]>(initialItems);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatRupiah = (angka?: number) => {
    if (!angka) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  const hapusItem = async (id: number) => {
    try {
      const { error } = await supabase.from('keranjang').delete().eq('id', id);
      if (error) throw error;
      setItems(items.filter(item => item.id !== id));
      toast.success('Item dihapus dari keranjang');
    } catch (err) {
      toast.error('Gagal menghapus item');
    }
  };

  const handleAjukanRequest = async () => {
    if (items.length === 0) return;
    
    if (currentUserVerifikasi !== 'terverifikasi') {
      toast.error('Lengkapi verifikasi akun terlebih dahulu untuk mengirim request.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      for (const item of items) {
        // Insert request
        const { error: reqError } = await supabase.from('request').insert({
          industri_id: industriId,
          umkm_id: item.umkm_id,
          produk_id: item.type === 'produk' ? item.item_id : null,
          equipment_id: item.type === 'equipment' ? item.item_id : null,
          pesan: `Permintaan kerja sama dari keranjang (Qty: ${item.kuantitas})`,
          status: 'pending'
        });

        if (reqError) throw reqError;

        // Kirim notifikasi
        await supabase.from('notifikasi').insert({
          user_id: item.umkm_user_id,
          pesan: `Anda menerima permintaan kerja sama baru dari ${industriName}`,
          status: 'belum dibaca'
        });

        // Hapus dari keranjang
        await supabase.from('keranjang').delete().eq('id', item.id);
      }

      toast.success('Request berhasil dikirim!');
      setItems([]);
      router.push('/dashboard-industri/transaksi'); // Redirect
    } catch (err: any) {
      console.error('Error saat submit:', err);
      toast.error(`Gagal mengirim request: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Keranjang Kosong</h3>
        <p className="text-gray-500 mb-6">Belum ada produk atau alat yang ditambahkan ke keranjang.</p>
        <button onClick={() => router.push('/pencarian')} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
          Cari Supplier UMKM
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-2/3 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4 sm:gap-6 items-center">
            {item.gambar_url ? (
              <img src={item.gambar_url} alt={item.nama} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl" />
            ) : (
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center ${item.type === 'produk' ? 'bg-indigo-50' : 'bg-cyan-50'}`}>
                {item.type === 'produk' ? <Package className="w-8 h-8 text-indigo-200" /> : <Wrench className="w-8 h-8 text-cyan-200" />}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.type === 'produk' ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700'}`}>
                  {item.type === 'produk' ? 'Produk' : 'Alat'}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1 truncate"><Building2 className="w-3 h-3"/> {item.nama_usaha}</span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate mb-1">{item.nama}</h3>
              <div className="font-black text-indigo-600 text-sm sm:text-base">
                {formatRupiah(item.harga)}
                {item.type === 'equipment' && <span className="text-gray-400 text-xs font-normal"> / Hari</span>}
              </div>
              <div className="mt-2 text-sm font-medium text-gray-700">Kuantitas: {item.kuantitas}</div>
            </div>
            
            <button onClick={() => hapusItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="lg:w-1/3">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Ringkasan Kolaborasi</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Item</span>
              <span className="font-medium text-gray-900">{items.length} Item</span>
            </div>
          </div>
          
          {currentUserVerifikasi !== 'terverifikasi' && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm mb-4">
              Lengkapi verifikasi akun terlebih dahulu untuk mengirim request. 
              <a href="/profil" className="block mt-1 font-bold underline">Ke Halaman Profil</a>
            </div>
          )}

          <button 
            onClick={handleAjukanRequest}
            disabled={isSubmitting || currentUserVerifikasi !== 'terverifikasi'}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-200 disabled:opacity-50"
          >
            {isSubmitting ? 'Memproses...' : (
              <>
                <Send className="w-5 h-5" />
                Ajukan Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
