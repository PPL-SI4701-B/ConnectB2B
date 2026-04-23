'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Bell, 
  Trash2, 
  Pencil, 
  Tag
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CatalogClient({ 
  produkList, 
  equipmentList, 
  statusVerifikasi 
}: { 
  produkList: any[]; 
  equipmentList: any[]; 
  statusVerifikasi: string;
}) {
  const [activeTab, setActiveTab] = useState<'produk' | 'equipment'>('produk');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  const activeItems = (activeTab === 'produk' ? produkList : equipmentList) || [];
  const filteredItems = activeItems.filter(item => 
    item?.nama?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number, gambar_url?: string) => {
    if (!confirm('Yakin ingin menghapus item ini?')) return;
    
    setIsDeleting(true);
    try {
      if (activeTab === 'produk') {
        const { error } = await supabase.from('produk').delete().eq('id', id);
        if (error) throw error;

        // Coba delete dari storage jika punya gambar_url
        if (gambar_url) {
          const path = gambar_url.split('/').pop();
          if (path) {
            await supabase.storage.from('produk-images').remove([path]);
          }
        }
      } else {
        const { error } = await supabase.from('equipment').delete().eq('id', id);
        if (error) throw error;
      }
      
      router.refresh();
    } catch (error) {
      console.error('Error hapus:', error);
      alert('Gagal menghapus item');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-black">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">Halaman / Katalog Produk</div>
          <h1 className="text-3xl font-bold text-gray-900">Katalog & Aset Saya</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari di katalog Anda..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm w-64"
            />
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <img src="https://ui-avatars.com/api/?name=User&background=4318ff&color=fff" alt="Profile" className="w-10 h-10 rounded-full ml-2 cursor-pointer object-cover shadow-sm ring-2 ring-gray-100" />
        </div>
      </header>

      {statusVerifikasi !== 'terverifikasi' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <h3 className="font-semibold mb-1">Lengkapi Profil Anda</h3>
            <p className="text-sm">Lengkapi verifikasi akun untuk menambah produk ke katalog agar bisa dilihat oleh calon mitra.</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium rounded-lg text-sm transition-colors whitespace-nowrap">
            Verifikasi Sekarang
          </Link>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'produk' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('produk')}
          >
            Produk & Jasa
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'equipment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('equipment')}
          >
            Alat / Mesin Produksi
          </button>
        </div>
        
        <Link 
          href={statusVerifikasi === 'terverifikasi' ? "/dashboard/katalog/tambah" : "#"}
          onClick={(e) => {
            if (statusVerifikasi !== 'terverifikasi') {
              e.preventDefault();
              alert('Harap verifikasi akun terlebih dahulu untuk menambah produk.');
            }
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Item Baru
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
            {item.gambar_url ? (
              <img src={item.gambar_url} alt={item.nama} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                <Tag className="w-12 h-12 opacity-20" />
              </div>
            )}
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">{item.nama}</h3>
              <p className="text-gray-500 text-sm flex items-center gap-1 mb-3">
                <Tag className="w-3 h-3 text-indigo-500" />
                {item.kategori || item.status || 'No Category'}
              </p>
              
              <div className="mt-auto">
                <p className="font-bold text-indigo-600 text-lg">
                  {item.harga || item.harga_sewa ? formatRupiah(item.harga || item.harga_sewa) : 'Penawaran Khusus'}
                </p>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                  <Link 
                    href={activeTab === 'produk' ? `/dashboard/katalog/${item.id}/edit` : '#'} 
                    className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </Link>
                  <button 
                    onClick={() => handleDelete(item.id, item.gambar_url)}
                    disabled={isDeleting}
                    className="p-2 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg transition-colors disabled:opacity-50"
                    title="Hapus item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {statusVerifikasi === 'terverifikasi' && (
          <Link href="/dashboard/katalog/tambah" className="border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 min-h-[300px] transition-colors group cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="font-medium">Tambah {activeTab === 'produk' ? 'Produk' : 'Alat'} Baru</h3>
          </Link>
        )}
      </div>
    </div>
  );
}
