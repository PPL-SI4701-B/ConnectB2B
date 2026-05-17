'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Tag, MapPin, Phone, Package, Wrench, X, ChevronRight, Building2, Star } from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';
import { UmkmItem, Produk, Equipment } from '@/types/umkm';
import { createClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function PencarianClient({ 
  umkmList,
  categories,
  initialQuery = '',
  initialCategory = '',
  currentUserVerifikasi = ''
}: { 
  umkmList: UmkmItem[],
  categories: string[],
  initialQuery?: string,
  initialCategory?: string,
  currentUserVerifikasi?: string
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const [selectedUmkm, setSelectedUmkm] = useState<UmkmItem | null>(null);
  const [activeTab, setActiveTab] = useState<'produk' | 'equipment'>('produk');
  const [selectedItem, setSelectedItem] = useState<{ type: 'produk' | 'equipment', item: Produk | Equipment } | null>(null);
  
  // Request Form States
  const [requestJenis, setRequestJenis] = useState('Pesan Maklon (Jasa)');
  const [requestDetail, setRequestDetail] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const supabase = createClient();

  const handleKirimRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUmkm) return;
    
    if (currentUserVerifikasi !== 'terverifikasi') {
      toast.error('Lengkapi verifikasi akun terlebih dahulu.');
      return;
    }

    if (!requestDetail.trim()) {
      toast.error('Detail spesifikasi harus diisi.');
      return;
    }

    setIsRequesting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { data: industri } = await supabase
        .from('industri')
        .select('id, nama_perusahaan')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!industri?.id) {
        toast.error('Profil industri Anda belum lengkap.');
        setIsRequesting(false);
        return;
      }
      
      const pesanLengkap = `[${requestJenis}] ${requestDetail}`;
      
      const { error } = await supabase
        .from('request')
        .insert({
          industri_id: industri.id,
          umkm_id: Number(selectedUmkm.id),
          pesan: pesanLengkap,
          status: 'pending'
        } as any);

      if (error) throw error;
      
      // Notifikasi ke UMKM penerima
      await supabase.from('notifikasi').insert({
        user_id: selectedUmkm.user_id,
        pesan: `Anda menerima permintaan kerja sama baru dari ${industri.nama_perusahaan}`,
        status: 'belum dibaca'
      });
      
      toast.success('Request berhasil dikirim!');
      setRequestDetail('');
      router.push('/dashboard-industri/transaksi'); // Redirect ke halaman pantau transaksi
    } catch (err: any) {
      console.error('Error kirim request:', err);
      toast.error(`Gagal mengirim request: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) {
        params.set('q', searchTerm);
      } else {
        params.delete('q');
      }
      
      if (selectedCategory) {
        params.set('kategori', selectedCategory);
      } else {
        params.delete('kategori');
      }
      
      router.push(`?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, router, searchParams]);

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
          <div className="w-full sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-gray-900 bg-white cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat, index) => (
                <option key={`cat-${index}`} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Menampilkan <strong>{umkmList.length}</strong> supplier UMKM
        </p>
      </div>

      {/* Main Layout: List + Detail Panel */}
      <div className={`flex gap-6 transition-all duration-300 ${selectedUmkm ? 'items-start' : ''}`}>
        
        {/* UMKM Card Grid */}
        <div className={`transition-all duration-300 ${selectedUmkm ? 'w-full lg:w-1/2 xl:w-2/5' : 'w-full'}`}>
          {umkmList.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900">Tidak ada UMKM ditemukan</h3>
              <p className="text-gray-500">Coba ubah kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${selectedUmkm ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {umkmList.map((umkm) => (
                <div
                  key={umkm.id}
                  onClick={() => handleSelectUmkm(umkm)}
                  className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md group ${
                    selectedUmkm?.id === umkm.id
                      ? 'border-indigo-500 shadow-md ring-2 ring-indigo-100'
                      : 'border-gray-100 hover:border-indigo-200'
                  }`}
                >
                  {/* Card header with gradient */}
                  <div className="h-24 bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <Building2 className="w-12 h-12 text-white/80 relative z-10" />
                    {umkm.totalProduk > 0 && (
                      <span className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                        {umkm.totalProduk} item
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {umkm.nama_usaha}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium mb-2">
                      <Tag className="w-3 h-3" />
                      {umkm.kategori}
                    </div>
                    {umkm.alamat && umkm.alamat !== '-' && (
                      <div className="flex items-start gap-1 text-xs text-gray-500 mb-3 line-clamp-1">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        {umkm.alamat}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-indigo-400" />
                          {umkm.produk.length} produk
                        </span>
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-cyan-400" />
                          {umkm.equipment.length} alat
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-colors ${selectedUmkm?.id === umkm.id ? 'text-indigo-600' : 'text-gray-300 group-hover:text-indigo-400'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bug 4 Fix: Detail Panel - muncul di sisi kanan saat UMKM diklik */}
        {selectedUmkm && (
          <div className="hidden lg:block lg:w-1/2 xl:w-3/5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6 max-h-[calc(100vh-120px)] flex flex-col">
            {/* Panel Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-cyan-500 p-6 text-white relative">
              <button
                onClick={handleClosePanel}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold truncate">{selectedUmkm.nama_usaha}</h2>
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
              </div>
            </div>

            {/* Tab Nav */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              <button
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
                        onClick={() => setSelectedItem({ type: 'produk', item: p })}
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
              ) : (
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
                        onClick={() => setSelectedItem({ type: 'equipment', item: e })}
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
              )}
            </div>
            
            {/* Request Form Panel */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-indigo-600">🤝</span> Ajukan Request Kerjasama
              </h3>
              
              {currentUserVerifikasi !== 'terverifikasi' ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
                  Lengkapi verifikasi akun terlebih dahulu untuk mengirim request. 
                  <a href="/profil" className="ml-1 font-bold underline">Ke Halaman Profil</a>
                </div>
              ) : (
                <form onSubmit={handleKirimRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Permintaan</label>
                    <select 
                      value={requestJenis}
                      onChange={(e) => setRequestJenis(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white text-gray-900"
                    >
                      <option>Pesan Maklon (Jasa)</option>
                      <option>Suplai Bahan Baku</option>
                      <option>Sewa Alat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detail Spesifikasi / Durasi</label>
                    <textarea 
                      value={requestDetail}
                      onChange={(e) => setRequestDetail(e.target.value)}
                      rows={3} 
                      placeholder="Sebutkan target waktu, kuantitas order, spesifikasi, atau durasi..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-gray-900 resize-none bg-white"
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    disabled={isRequesting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isRequesting ? 'Mengirim...' : 'Kirim Request'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Detail Panel below list */}
      {selectedUmkm && (
        <div className="lg:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-cyan-500 p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">{selectedUmkm.nama_usaha}</h2>
              <button onClick={handleClosePanel} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-white/80">{selectedUmkm.kategori}</div>
            {selectedUmkm.alamat && selectedUmkm.alamat !== '-' && (
              <div className="flex items-center gap-1 text-sm text-white/80 mt-1">
                <MapPin className="w-3 h-3" /> {selectedUmkm.alamat}
              </div>
            )}
          </div>
          <div className="flex border-b border-gray-100">
            <button onClick={() => setActiveTab('produk')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'produk' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
              Produk ({selectedUmkm.produk.length})
            </button>
            <button onClick={() => setActiveTab('equipment')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'equipment' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
              Alat ({selectedUmkm.equipment.length})
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {(activeTab === 'produk' ? selectedUmkm.produk : selectedUmkm.equipment).map((item: any) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem({ type: activeTab, item })}
                className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className={`w-full h-24 flex items-center justify-center ${activeTab === 'produk' ? 'bg-indigo-50' : 'bg-cyan-50'}`}>
                  {activeTab === 'produk' ? <Package className="w-6 h-6 text-indigo-200" /> : <Wrench className="w-6 h-6 text-cyan-200" />}
                </div>
                <div className="p-2">
                  <h4 className="font-semibold text-gray-900 text-xs line-clamp-1">{item.nama}</h4>
                  <p className="text-indigo-600 font-bold text-xs mt-0.5">
                    {formatRupiah(item.harga || item.harga_sewa)}
                    {activeTab === 'equipment' && <span className="text-gray-400 font-normal"> /hari</span>}
                  </p>
                </div>
              </div>
            ))}
            {(activeTab === 'produk' ? selectedUmkm.produk : selectedUmkm.equipment).length === 0 && (
              <div className="col-span-2 py-6 text-center text-gray-400 text-sm">Belum ada item.</div>
            )}
          </div>
          
          {/* Mobile Request Form */}
          <div className="p-5 border-t border-gray-100 bg-gray-50 mt-auto">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <span className="text-indigo-600">🤝</span> Ajukan Request Kerjasama
            </h3>
            
            {currentUserVerifikasi !== 'terverifikasi' ? (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-xs">
                Lengkapi verifikasi akun terlebih dahulu. 
                <a href="/profil" className="ml-1 font-bold underline">Ke Profil</a>
              </div>
            ) : (
              <form onSubmit={handleKirimRequest} className="space-y-3">
                <div>
                  <select 
                    value={requestJenis}
                    onChange={(e) => setRequestJenis(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option>Pesan Maklon (Jasa)</option>
                    <option>Suplai Bahan Baku</option>
                    <option>Sewa Alat</option>
                  </select>
                </div>
                <div>
                  <textarea 
                    value={requestDetail}
                    onChange={(e) => setRequestDetail(e.target.value)}
                    rows={2} 
                    placeholder="Sebutkan detail spesifikasi / durasi..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none bg-white"
                  ></textarea>
                </div>
                <button 
                  type="submit"
                  disabled={isRequesting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {isRequesting ? 'Mengirim...' : 'Kirim Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">
                Detail {selectedItem.type === 'produk' ? 'Produk & Jasa' : 'Alat/Mesin'}
              </h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex flex-col max-h-[75vh] overflow-y-auto">
              {selectedItem.item.gambar_url ? (
                <img src={selectedItem.item.gambar_url} alt={selectedItem.item.nama} className="w-full h-56 sm:h-72 object-cover" />
              ) : (
                <div className={`w-full h-56 sm:h-72 flex items-center justify-center ${selectedItem.type === 'produk' ? 'bg-indigo-50/50' : 'bg-cyan-50/50'}`}>
                  {selectedItem.type === 'produk' ? <Package className={`w-16 h-16 text-indigo-200`} /> : <Wrench className={`w-16 h-16 text-cyan-200`} />}
                </div>
              )}
              
              <div className="p-6 sm:p-8">
                <div className="mb-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${selectedItem.type === 'produk' ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700'}`}>
                    {selectedItem.type === 'produk' ? 'Produk' : 'Alat/Mesin'}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2 leading-tight">{selectedItem.item.nama}</h2>
                <div className={`text-3xl font-black mb-6 ${selectedItem.type === 'produk' ? 'text-indigo-600' : 'text-cyan-600'}`}>
                  {selectedItem.type === 'produk' 
                    ? formatRupiah((selectedItem.item as Produk).harga) 
                    : <>{formatRupiah((selectedItem.item as Equipment).harga_sewa)}<span className="text-base text-gray-500 font-medium"> / hari</span></>}
                </div>
                
                <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deskripsi Lengkap</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {selectedItem.item.deskripsi || 'Tidak ada deskripsi tersedia untuk item ini.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => {
                      setRequestJenis(selectedItem?.type === 'produk' ? 'Pesan Maklon (Jasa)' : 'Sewa Alat');
                      setRequestDetail(`Tertarik dengan ${selectedItem?.type === 'produk' ? 'produk' : 'alat'}: ${selectedItem?.item.nama}`);
                      setSelectedItem(null);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-indigo-200"
                  >
                    Pilih Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
