'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Tag, Filter, Star, MapPin, SlidersHorizontal } from 'lucide-react';

export default function PencarianClient({ items }: { items: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('terbaru');
  
  const getSatuan = (deskripsi: string) => {
    if (!deskripsi) return '';
    const match = deskripsi.match(/Satuan:\s*(.*?)\n/);
    return match ? match[1] : '';
  };

  const sortedItems = useMemo(() => {
    let result = [...items];
    
    // Filter by search
    if (searchTerm) {
      result = result.filter(item => 
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'terbaru':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : a.id;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : b.id;
          return dateB - dateA;
        case 'harga_terendah':
          return (a.harga || 0) - (b.harga || 0);
        case 'harga_tertinggi':
          return (b.harga || 0) - (a.harga || 0);
        case 'rating_tertinggi':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });
    
    return result;
  }, [items, searchTerm, sortBy]);

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
          <div className="text-sm font-medium text-gray-500 mb-1">Halaman / Pencarian</div>
          <h1 className="text-3xl font-bold text-gray-900">Katalog Publik</h1>
        </div>
      </header>

      {/* Filter and Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cari Produk, Alat, atau UMKM</label>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Contoh: Jasa Maklon, Mesin Jahit..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="w-full md:w-64">
          <label className="block text-sm font-medium text-gray-700 mb-2">Urutkan Berdasarkan</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white"
          >
            <option value="terbaru">Terbaru</option>
            <option value="harga_terendah">Harga Terendah</option>
            <option value="harga_tertinggi">Harga Tertinggi</option>
            <option value="rating_tertinggi">Rating Tertinggi</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-gray-900 font-medium">Menampilkan {sortedItems.length} item</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedItems.map((item) => (
          <div key={`${item.type}-${item.id}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
            <div className="relative">
              {item.gambar_url ? (
                <img src={item.gambar_url} alt={item.nama} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                  <Tag className="w-12 h-12 opacity-20" />
                </div>
              )}
              <div className="absolute top-3 left-3">
                <span className={`px-2 py-1 text-xs font-bold rounded-md ${item.type === 'produk' ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700'}`}>
                  {item.type === 'produk' ? 'Produk & Jasa' : 'Alat/Mesin'}
                </span>
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">{item.nama}</h3>
              <p className="text-gray-500 text-sm flex items-center gap-1 mb-2">
                <Tag className="w-3 h-3 text-indigo-500" />
                {item.kategori || item.status || 'No Category'}
              </p>
              
              <div className="flex items-center gap-1 mb-4 text-sm text-gray-600 border-b border-gray-50 pb-4">
                <span className="font-medium text-gray-800">{item.vendorName}</span>
                {item.rating > 0 && (
                  <span className="flex items-center gap-1 ml-auto bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-xs font-bold">
                    <Star className="w-3 h-3 fill-current" /> {item.rating.toFixed(1)}
                  </span>
                )}
              </div>
              
              <div className="mt-auto">
                <p className="font-bold text-indigo-600 text-lg">
                  {item.harga ? formatRupiah(item.harga) : 'Penawaran Khusus'}
                  {item.type === 'produk' && item.deskripsi && <span className="text-sm text-gray-500 font-normal ml-1">{getSatuan(item.deskripsi)}</span>}
                  {item.type === 'equipment' && <span className="text-sm text-gray-500 font-normal ml-1">/ Hari</span>}
                </p>
                
                <button className="w-full mt-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 py-2.5 rounded-xl font-medium transition-colors text-sm">
                  Lihat Detail
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {sortedItems.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-100">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">Tidak ada item ditemukan</h3>
            <p className="text-gray-500">Coba ubah kata kunci atau filter pencarian Anda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
