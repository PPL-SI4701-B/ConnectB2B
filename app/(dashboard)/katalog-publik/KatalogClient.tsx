'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

type Product = {
  id: number;
  nama: string;
  deskripsi: string | null;
  gambar_url: string | null;
  harga: number | null;
  kategori: string | null;
  user_id: string;
  umkm: {
    nama_usaha: string;
    avg_rating: number | null;
    total_ulasan: number;
  } | null;
};

type Category = {
  id: number;
  nama_kategori: string;
};

interface KatalogClientProps {
  initialProducts: Product[];
  categories: Category[];
}

export default function KatalogClient({ initialProducts, categories }: KatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentCategory = searchParams.get('kategori') || 'all';
  const currentSort = searchParams.get('sort') || 'terbaru';

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('kategori', e.target.value);
    router.push(`?${params.toString()}`);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    router.push(`?${params.toString()}`);
  };

  // Client-side filtering & sorting for smooth UX
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...initialProducts];

    // Filter
    if (currentCategory !== 'all') {
      result = result.filter(p => p.kategori === currentCategory);
    }

    // Sort
    result.sort((a, b) => {
      if (currentSort === 'terbaru') {
        return b.id - a.id;
      } else if (currentSort === 'termurah') {
        return (a.harga || 0) - (b.harga || 0);
      } else if (currentSort === 'termahal') {
        return (b.harga || 0) - (a.harga || 0);
      } else if (currentSort === 'rating') {
        return (b.umkm?.avg_rating || 0) - (a.umkm?.avg_rating || 0);
      }
      return 0;
    });

    return result;
  }, [initialProducts, currentCategory, currentSort]);

  const formatRupiah = (angka: number | null) => {
    if (!angka) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Katalog Publik</h1>
          <p className="text-slate-500 mt-1">Temukan berbagai produk dan jasa dari UMKM terbaik.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            value={currentCategory} 
            onChange={handleCategoryChange}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-700"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.nama_kategori}>{cat.nama_kategori}</option>
            ))}
          </select>
          
          <select 
            value={currentSort} 
            onChange={handleSortChange}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-700"
          >
            <option value="terbaru">Terbaru</option>
            <option value="termurah">Harga: Terendah</option>
            <option value="termahal">Harga: Tertinggi</option>
            <option value="rating">Rating Tertinggi</option>
          </select>
        </div>
      </div>

      {filteredAndSortedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Tidak ada produk</h3>
          <p className="text-slate-500 max-w-sm">Maaf, kami tidak dapat menemukan produk yang sesuai dengan filter Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedProducts.map(product => (
            <Link href={`/katalog-publik/${product.id}`} key={product.id} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
                {product.gambar_url ? (
                  <img 
                    src={product.gambar_url} 
                    alt={product.nama}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-300">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {product.kategori && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-700 rounded-full shadow-sm">
                      {product.kategori}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-xs font-bold uppercase">
                    {product.umkm?.nama_usaha?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-medium text-slate-500 truncate">
                    {product.umkm?.nama_usaha || 'UMKM Tidak Diketahui'}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {product.nama}
                </h3>

                {product.umkm?.avg_rating != null ? (
                  <div className="flex items-center gap-1 mb-1">
                    {[1,2,3,4,5].map(star => (
                      <svg key={star} className={`w-3.5 h-3.5 ${star <= Math.round(product.umkm!.avg_rating!) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                    <span className="text-xs text-slate-500 ml-1">{product.umkm!.avg_rating!.toFixed(1)} ({product.umkm!.total_ulasan})</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mb-1">Belum ada ulasan</div>
                )}

                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-600">
                    {formatRupiah(product.harga)}
                  </span>
                  
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
