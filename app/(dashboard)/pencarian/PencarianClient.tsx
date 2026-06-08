'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Tag, MapPin, Phone, Package, Wrench, X, ChevronRight, Star, ShoppingCart, Filter, BadgeCheck, MessageSquare } from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';
import { UmkmItem, Produk, Equipment } from '@/types/umkm';
import { createClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { addToCart } from '@/app/actions/cart-actions';
import { sendDirectRequest } from '@/app/actions/request-actions';
import UlasanSection from '@/components/ui/UlasanSection';

export default function PencarianClient({ 
  umkmList,
  categories,
  locations,
  initialQuery = '',
  initialCategoryList = [],
  initialLokasi = '',
  initialMinHarga,
  initialMaxHarga,
  initialVerifiedOnly = true,
  currentUserVerifikasi = '',
  userRole = 'umkm',
  currentUmkmId = null
}: { 
  umkmList: UmkmItem[],
  categories: string[],
  locations: string[],
  initialQuery?: string,
  initialCategoryList?: string[],
  initialLokasi?: string,
  initialMinHarga?: number,
  initialMaxHarga?: number,
  initialVerifiedOnly?: boolean,
  currentUserVerifikasi?: string,
  userRole?: string,
  currentUmkmId?: number | null
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategoryList, setSelectedCategoryList] = useState<string[]>(initialCategoryList);
  const [selectedLokasi, setSelectedLokasi] = useState(initialLokasi);
  const [minHarga, setMinHarga] = useState(initialMinHarga?.toString() || '');
  const [maxHarga, setMaxHarga] = useState(initialMaxHarga?.toString() || '');
  const [verifiedOnly, setVerifiedOnly] = useState(initialVerifiedOnly);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedUmkm, setSelectedUmkm] = useState<UmkmItem | null>(null);
  const [activeTab, setActiveTab] = useState<'produk' | 'equipment' | 'ulasan'>('produk');
  // detailItem = item yang sedang dibuka di modal detail; selectedItem = item yang dilampirkan ke form request
  const [detailItem, setDetailItem] = useState<{ type: 'produk' | 'equipment', item: Produk | Equipment } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: 'produk' | 'equipment', item: Produk | Equipment } | null>(null);
  
  // Cart States
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Request Form States
  const [jenisPermintaan, setJenisPermintaan] = useState('Pesan Maklon (Jasa)');
  const [pesanRequest, setPesanRequest] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Function to apply filters
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchTerm) params.set('q', searchTerm);
    else params.delete('q');
    
    params.delete('kategori');
    selectedCategoryList.forEach(c => params.append('kategori', c));
    
    if (selectedLokasi) params.set('lokasi', selectedLokasi);
    else params.delete('lokasi');
    
    if (minHarga) params.set('minHarga', minHarga);
    else params.delete('minHarga');
    
    if (maxHarga) params.set('maxHarga', maxHarga);
    else params.delete('maxHarga');
    
    params.set('verifiedOnly', verifiedOnly.toString());
    
    router.push(`?${params.toString()}`);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategoryList([]);
    setSelectedLokasi('');
    setMinHarga('');
    setMaxHarga('');
    setVerifiedOnly(true);
    router.push('?');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      // Auto-apply search term only, other filters applied via button
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm !== initialQuery) {
        if (searchTerm) params.set('q', searchTerm);
        else params.delete('q');
        router.push(`?${params.toString()}`);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, initialQuery, router, searchParams]);

  const isUmkm = userRole === 'umkm';

  const handleDirectRequest = async () => {
    if (!selectedUmkm) return;
    const hasItems = selectedUmkm.produk.length > 0 || selectedUmkm.equipment.length > 0;
    if (hasItems && !selectedItem) {
      toast.error('Pilih produk/jasa yang ingin direquest terlebih dahulu');
      return;
    }
    if (!pesanRequest.trim()) {
      toast.error('Detail spesifikasi harus diisi');
      return;
    }

    setIsSendingRequest(true);
    try {
      const produkId = selectedItem?.type === 'produk' ? selectedItem.item.id : null;
      const equipmentId = selectedItem?.type === 'equipment' ? selectedItem.item.id : null;
      const itemLabel = selectedItem ? ` — Item: ${selectedItem.item.nama}` : '';

      const res = await sendDirectRequest({
        targetUmkmId: Number(selectedUmkm.id),
        produk_id: produkId,
        equipment_id: equipmentId,
        kuantitas: selectedItem ? quantity : 1,
        pesan: `[${jenisPermintaan}]${itemLabel}${selectedItem ? ` x${quantity}` : ''} ${pesanRequest}`,
      });
      if (!res?.success) {
        toast.error(res?.error || 'Gagal mengirim request');
        return;
      }
      toast.success('Request berhasil dikirim!');
      setPesanRequest('');
      setSelectedItem(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim request');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleAddToCart = async () => {
    if (!detailItem || !selectedUmkm) return;

    setIsAdding(true);
    try {
      await addToCart({
        produk_id: detailItem.type === 'produk' ? detailItem.item.id : null,
        equipment_id: detailItem.type === 'equipment' ? detailItem.item.id : null,
        kuantitas: quantity,
        umkm_id: Number(selectedUmkm.id)
      });
      toast.success('Berhasil ditambahkan ke keranjang!');
      setDetailItem(null);
      setQuantity(1);
    } catch (err: any) {
      if (err.message?.startsWith('UMKM_CONFLICT:')) {
        const existingNama = err.message.replace('UMKM_CONFLICT:', '');
        toast.error(
          `Keranjang sudah berisi item dari "${existingNama}". Kosongkan keranjang terlebih dahulu untuk menambahkan produk dari UMKM lain.`,
          { duration: 6000 }
        );
      } else {
        toast.error(err.message || 'Gagal menambahkan ke keranjang');
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Buka modal detail item (dipanggil saat klik kartu produk/alat di drawer)
  const openItemDetail = (entry: { type: 'produk' | 'equipment', item: Produk | Equipment }) => {
    setDetailItem(entry);
    setQuantity(1);
  };

  // Lampirkan item ke form request kerja sama, lalu tutup modal (selection tetap dipertahankan)
  const pickItemForRequest = () => {
    if (!detailItem) return;
    setSelectedItem(detailItem);
    setDetailItem(null);
  };

  const formatRupiah = (angka?: number) => {
    if (!angka) return 'Penawaran Khusus';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  const handleSelectUmkm = (umkm: UmkmItem) => {
    setSelectedUmkm(umkm);
    setActiveTab('produk');
  };

  const handleClosePanel = () => {
    setSelectedUmkm(null);
    setSelectedItem(null);
    setDetailItem(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-black">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">Halaman / Cari Supplier</div>
          {/* Bug 4 Fix: Updated title to correctly describe FR-07 - finding UMKM suppliers */}
          <h1 className="text-3xl font-bold text-gray-900">Temukan Supplier UMKM</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </header>

      {/* Search Bar & Filter */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama UMKM, produk, atau lokasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center gap-2 font-medium text-gray-700 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filter Lanjutan
            </button>
          </div>
          
          {showFilters && (
            <div className="pt-4 border-t border-gray-100 mt-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Lokasi */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Lokasi Operasional</label>
                <select
                  value={selectedLokasi}
                  onChange={(e) => setSelectedLokasi(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-gray-900"
                >
                  <option value="">Semua Lokasi</option>
                  {locations.map((loc, idx) => (
                    <option key={`loc-${idx}`} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Harga */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Range Harga (Rp)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minHarga}
                    onChange={(e) => setMinHarga(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-gray-900 text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxHarga}
                    onChange={(e) => setMaxHarga(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-gray-900 text-sm"
                  />
                </div>
              </div>

              {/* Verifikasi */}
              <div className="flex items-center h-full pt-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${verifiedOnly ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-400'}`}>
                    {verifiedOnly && <Star className="w-4 h-4 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-gray-700">Hanya UMKM Terverifikasi</span>
                </label>
              </div>

              {/* Kategori */}
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Usaha / Kategori</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat, idx) => (
                    <button
                      key={`catbtn-${idx}`}
                      onClick={() => {
                        if (selectedCategoryList.includes(cat)) {
                          setSelectedCategoryList(selectedCategoryList.filter(c => c !== cat));
                        } else {
                          setSelectedCategoryList([...selectedCategoryList, cat]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                        selectedCategoryList.includes(cat)
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="md:col-span-3 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Reset Filter
                </button>
                <button
                  onClick={applyFilters}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Menampilkan <strong>{umkmList.length}</strong> supplier UMKM
        </p>
      </div>

      {/* Daftar Supplier (selalu full width; detail tampil sebagai drawer) */}
      <div>
        <div className="w-full">
          {umkmList.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900">Tidak ada UMKM ditemukan</h3>
              <p className="text-gray-500">Coba ubah kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {umkmList.map((umkm) => {
                const isSelected = selectedUmkm?.id === umkm.id;
                const initials = (umkm.nama_usaha || 'U')
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w: string) => w[0])
                  .join('')
                  .toUpperCase();
                const isVerified = umkm.status_verifikasi === 'terverifikasi';
                return (
                  <div
                    key={umkm.id}
                    onClick={() => handleSelectUmkm(umkm)}
                    className={`group relative bg-white rounded-2xl p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-md'
                        : 'border-gray-100 hover:border-indigo-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Avatar inisial + badge verifikasi */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                          {initials}
                        </div>
                        {isVerified && (
                          <span className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full" title="Terverifikasi">
                            <BadgeCheck className="w-5 h-5 text-emerald-500" fill="#d1fae5" />
                          </span>
                        )}
                      </div>

                      {/* Konten */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {umkm.nama_usaha}
                          </h3>
                          <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${isSelected ? 'text-indigo-600' : 'text-gray-300 group-hover:text-indigo-400'}`} />
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                            <Tag className="w-3 h-3" /> {umkm.kategori}
                          </span>
                          {umkm.rating_count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {umkm.rating_avg.toFixed(1)}
                              <span className="text-gray-400 font-normal">({umkm.rating_count})</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">Belum ada ulasan</span>
                          )}
                        </div>

                        {umkm.alamat && umkm.alamat !== '-' && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{umkm.alamat}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                            <Package className="w-3 h-3 text-indigo-400" /> {umkm.produk.length} Produk
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                            <Wrench className="w-3 h-3 text-cyan-400" /> {umkm.equipment.length} Alat
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Supplier — drawer geser dari kanan */}
        {selectedUmkm && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleClosePanel} />
            <aside className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-cyan-500 p-6 text-white relative shrink-0">
              <button
                onClick={handleClosePanel}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm font-bold text-lg shrink-0">
                  {(selectedUmkm.nama_usaha || 'U').trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold truncate">{selectedUmkm.nama_usaha}</h2>
                    {selectedUmkm.status_verifikasi === 'terverifikasi' && (
                      <BadgeCheck className="w-5 h-5 text-white shrink-0" fill="rgba(255,255,255,0.25)" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                    <Tag className="w-3 h-3" />
                    {selectedUmkm.kategori}
                  </div>
                </div>
              </div>

              {/* Info row */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/90">
                {selectedUmkm.alamat && selectedUmkm.alamat !== '-' && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="line-clamp-1">{selectedUmkm.alamat}</span>
                  </div>
                )}
                {selectedUmkm.kontak && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4 shrink-0" />
                    {selectedUmkm.kontak}
                  </div>
                )}
                {/* FR-18: Rating summary in header */}
                <div className="flex items-center gap-1" id="header-rating-summary">
                  <Star className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
                  <span className="font-semibold">
                    {selectedUmkm.rating_avg > 0 ? selectedUmkm.rating_avg.toFixed(1) : '-'}
                  </span>
                  <span className="text-white/60 text-xs">({selectedUmkm.rating_count} ulasan)</span>
                </div>
              </div>
            </div>

            {/* Tab Nav */}
            <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
              <button
                id="tab-produk"
                onClick={() => setActiveTab('produk')}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'produk'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Package className="w-4 h-4" />
                Produk & Jasa ({selectedUmkm.produk.length})
              </button>
              <button
                id="tab-equipment"
                onClick={() => setActiveTab('equipment')}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'equipment'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Wrench className="w-4 h-4" />
                Alat/Mesin ({selectedUmkm.equipment.length})
              </button>
              {/* FR-18: Tab Ulasan */}
              <button
                id="tab-ulasan"
                onClick={() => setActiveTab('ulasan')}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'ulasan'
                    ? 'text-amber-600 border-b-2 border-amber-500 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Star className="w-4 h-4" />
                Ulasan ({selectedUmkm.rating_count})
              </button>
            </div>

            {/* Panel Body - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6">
              {activeTab === 'produk' ? (
                selectedUmkm.produk.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Belum ada produk/jasa yang didaftarkan.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedUmkm.produk.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => openItemDetail({ type: 'produk', item: p })}
                        className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                      >
                        {p.gambar_url ? (
                          <img src={p.gambar_url} alt={p.nama} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 bg-indigo-50 flex items-center justify-center">
                            <Package className="w-8 h-8 text-indigo-200" />
                          </div>
                        )}
                        <div className="p-3">
                          <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{p.nama}</h4>
                          <p className="text-indigo-600 font-bold text-sm mt-1">{formatRupiah(p.harga)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activeTab === 'equipment' ? (
                selectedUmkm.equipment.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Belum ada alat/mesin yang didaftarkan.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedUmkm.equipment.map((e) => (
                      <div 
                        key={e.id}
                        onClick={() => openItemDetail({ type: 'equipment', item: e })}
                        className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:border-cyan-200 transition-colors cursor-pointer shadow-sm hover:shadow-md"
                      >
                        {e.gambar_url ? (
                          <img src={e.gambar_url} alt={e.nama} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 bg-cyan-50 flex items-center justify-center">
                            <Wrench className="w-8 h-8 text-cyan-200" />
                          </div>
                        )}
                        <div className="p-3">
                          <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{e.nama}</h4>
                          <p className="text-cyan-600 font-bold text-sm mt-1">{formatRupiah(e.harga_sewa)}<span className="text-gray-400 font-normal"> / Hari</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* FR-18: Ulasan tab */
                <UlasanSection
                  ulasan={selectedUmkm.ulasan}
                  rating_avg={selectedUmkm.rating_avg}
                  rating_count={selectedUmkm.rating_count}
                  umkm_nama={selectedUmkm.nama_usaha}
                />
              )}
            </div>
            
            {/* Form Request — footer sticky, selalu terlihat */}
            <div className="border-t border-gray-100 bg-gray-50 p-5 shrink-0">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-[15px]">
                <span className="text-xl">🤝</span> Ajukan Request Kerjasama
              </h3>

              {(selectedUmkm.produk.length > 0 || selectedUmkm.equipment.length > 0) && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Produk / Jasa yang direquest <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedItem ? `${selectedItem.type}:${selectedItem.item.id}` : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) { setSelectedItem(null); return; }
                      const [type, idStr] = v.split(':');
                      const id = Number(idStr);
                      if (type === 'produk') {
                        const item = selectedUmkm.produk.find((p) => p.id === id);
                        if (item) { setSelectedItem({ type: 'produk', item }); setQuantity(1); }
                      } else {
                        const item = selectedUmkm.equipment.find((eq) => eq.id === id);
                        if (item) { setSelectedItem({ type: 'equipment', item }); setQuantity(1); }
                      }
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="">— Pilih produk/jasa —</option>
                    {selectedUmkm.produk.length > 0 && (
                      <optgroup label="Produk & Jasa">
                        {selectedUmkm.produk.map((p) => (
                          <option key={`produk-${p.id}`} value={`produk:${p.id}`}>{p.nama}</option>
                        ))}
                      </optgroup>
                    )}
                    {selectedUmkm.equipment.length > 0 && (
                      <optgroup label="Alat/Mesin">
                        {selectedUmkm.equipment.map((eq) => (
                          <option key={`equipment-${eq.id}`} value={`equipment:${eq.id}`}>{eq.nama}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {selectedItem && (
                <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-indigo-700 font-semibold line-clamp-1">
                      {selectedItem.type === 'produk' ? '📦' : '🔧'} {selectedItem.item.nama}
                    </span>
                    <button onClick={() => setSelectedItem(null)} className="shrink-0 text-indigo-400 hover:text-indigo-600" title="Hapus item">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-indigo-600 font-medium">Jumlah:</span>
                    <div className="flex items-center bg-white rounded-lg border border-indigo-200">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-7 h-7 flex items-center justify-center text-indigo-600 font-bold hover:bg-indigo-50 rounded-l-lg">-</button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 h-7 text-center bg-transparent text-sm font-bold text-gray-900 border-none focus:ring-0"
                        min="1"
                      />
                      <button onClick={() => setQuantity(quantity + 1)} className="w-7 h-7 flex items-center justify-center text-indigo-600 font-bold hover:bg-indigo-50 rounded-r-lg">+</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={jenisPermintaan}
                  onChange={(e) => setJenisPermintaan(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="Pesan Maklon (Jasa)">Pesan Maklon (Jasa)</option>
                  <option value="Pembelian Grosir">Pembelian Grosir</option>
                  <option value="Sewa Alat">Sewa Alat</option>
                  <option value="Kolaborasi Proyek">Kolaborasi Proyek</option>
                </select>
                <input
                  type="text"
                  value={pesanRequest}
                  onChange={(e) => setPesanRequest(e.target.value)}
                  placeholder="Detail: target waktu, spesifikasi, durasi..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>

              {currentUserVerifikasi !== 'terverifikasi' && (
                <p className="text-[11px] text-amber-600 mt-2">Akun Anda harus terverifikasi untuk mengirim request.</p>
              )}

              <button
                onClick={handleDirectRequest}
                disabled={isSendingRequest || currentUserVerifikasi !== 'terverifikasi'}
                className="mt-3 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm shadow-sm"
              >
                {isSendingRequest ? 'Mengirim...' : 'Kirim Request'}
              </button>
            </div>
            </aside>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-gray-900">
                Detail {detailItem.type === 'produk' ? 'Produk & Jasa' : 'Alat/Mesin'}
              </h3>
              <button onClick={() => setDetailItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {detailItem.item.gambar_url ? (
                <img src={detailItem.item.gambar_url} alt={detailItem.item.nama} className="w-full h-56 sm:h-72 object-cover" />
              ) : (
                <div className={`w-full h-56 sm:h-72 flex items-center justify-center ${detailItem.type === 'produk' ? 'bg-indigo-50/50' : 'bg-cyan-50/50'}`}>
                  {detailItem.type === 'produk' ? <Package className={`w-16 h-16 text-indigo-200`} /> : <Wrench className={`w-16 h-16 text-cyan-200`} />}
                </div>
              )}

              <div className="p-6 sm:p-8">
                <div className="mb-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${detailItem.type === 'produk' ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700'}`}>
                    {detailItem.type === 'produk' ? 'Produk' : 'Alat/Mesin'}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2 leading-tight">{detailItem.item.nama}</h2>
                <div className={`text-3xl font-black mb-6 ${detailItem.type === 'produk' ? 'text-indigo-600' : 'text-cyan-600'}`}>
                  {detailItem.type === 'produk'
                    ? formatRupiah((detailItem.item as Produk).harga)
                    : <>{formatRupiah((detailItem.item as Equipment).harga_sewa)}<span className="text-base text-gray-500 font-medium"> / hari</span></>}
                </div>

                <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deskripsi Lengkap</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {detailItem.item.deskripsi || 'Tidak ada deskripsi tersedia untuk item ini.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer aksi — quantity hanya muncul untuk Industri (punya keranjang) */}
            <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white space-y-3">
              {!isUmkm && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-600">Jumlah</span>
                  <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold rounded-l-xl"
                    >-</button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 h-10 text-center bg-transparent font-bold text-gray-900 border-none focus:ring-0"
                      min="1"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold rounded-r-xl"
                    >+</button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDetailItem(null)}
                  className="px-5 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Tutup
                </button>
                {!isUmkm && (
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className="flex-1 px-5 py-3 bg-white border-2 border-indigo-200 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {isAdding ? '...' : 'Keranjang'}
                  </button>
                )}
                <button
                  onClick={pickItemForRequest}
                  className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-indigo-200"
                >
                  <MessageSquare className="w-5 h-5" />
                  Pilih untuk Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
