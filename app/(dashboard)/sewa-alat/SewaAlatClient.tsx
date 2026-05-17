'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, MapPin, Building2, X, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface EquipmentWithUmkm {
  id: number;
  nama: string;
  deskripsi: string;
  harga_sewa: number;
  gambar_url: string;
  status: string;
  user_id: string;
  owner_umkm_id: number;
  owner_nama_usaha: string;
  owner_alamat: string;
  owner_kategori: string;
}

export default function SewaAlatClient({
  equipments,
  currentUmkm,
  currentUserVerifikasi
}: {
  equipments: EquipmentWithUmkm[];
  currentUmkm: { id: number; nama_usaha: string } | null;
  currentUserVerifikasi: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedEq, setSelectedEq] = useState<EquipmentWithUmkm | null>(null);
  
  // Form state
  const [durasi, setDurasi] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatRupiah = (angka?: number) => {
    if (!angka) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  const handleKirimRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEq) return;

    if (currentUserVerifikasi !== 'terverifikasi') {
      toast.error('Lengkapi verifikasi akun terlebih dahulu.');
      return;
    }

    if (!durasi.trim()) {
      toast.error('Durasi negosiasi harus diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const senderName = currentUmkm?.nama_usaha || 'UMKM (Tidak Diketahui)';
      const pesanKerjasama = `[Sewa Alat Lintas UMKM] Permintaan sewa untuk alat: ${selectedEq.nama}. Durasi yang diajukan: ${durasi}. Dari: ${senderName}`;
      
      const { error } = await supabase
        .from('request')
        .insert({
          industri_id: null, // Karena ini dari UMKM ke UMKM
          umkm_id: selectedEq.owner_umkm_id,
          equipment_id: selectedEq.id,
          pesan: pesanKerjasama,
          status: 'pending'
        });

      if (error) throw error;
      
      // Kirim Notifikasi ke UMKM pemilik alat
      await supabase.from('notifikasi').insert({
        user_id: selectedEq.user_id,
        pesan: `Anda menerima permintaan penyewaan alat (${selectedEq.nama}) dari ${senderName}`,
        status: 'belum dibaca'
      });
      
      toast.success('Kontrak Sewa berhasil diajukan!');
      setSelectedEq(null);
      setDurasi('');
      router.push('/dashboard/transaksi');
    } catch (err: any) {
      console.error('Error kirim request:', err);
      toast.error(`Gagal mengirim request: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-6 relative">
      <div className={`transition-all duration-300 w-full ${selectedEq ? 'lg:w-1/2' : ''}`}>
        {equipments.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">Belum ada alat yang disewakan</h3>
          </div>
        ) : (
          <div className={`grid gap-4 ${selectedEq ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {equipments.map((eq) => (
              <div
                key={eq.id}
                onClick={() => setSelectedEq(eq)}
                className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                  selectedEq?.id === eq.id ? 'border-cyan-500 shadow-md' : 'border-gray-100 hover:border-cyan-200'
                }`}
              >
                {eq.gambar_url ? (
                  <img src={eq.gambar_url} alt={eq.nama} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-cyan-50 flex items-center justify-center">
                    <Wrench className="w-10 h-10 text-cyan-200" />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="text-xs text-cyan-600 font-bold mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {eq.owner_nama_usaha}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-1 truncate">{eq.nama}</h3>
                  <div className="font-black text-cyan-600 mb-2">
                    {formatRupiah(eq.harga_sewa)} <span className="text-gray-400 text-xs font-normal">/ Hari</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1 truncate max-w-[120px]"><MapPin className="w-3 h-3 shrink-0" /> {eq.owner_alamat}</span>
                    <span className="flex items-center gap-1 text-amber-500 font-bold"><Star className="w-3 h-3 fill-amber-500" /> 4.5</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedEq && (
        <div className="hidden lg:block lg:w-1/2 bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-6 h-fit overflow-hidden">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-500 p-6 text-white relative">
            <button onClick={() => setSelectedEq(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedEq.nama}</h2>
                <div className="text-white/80 text-sm mt-1 flex items-center gap-1"><Building2 className="w-4 h-4" /> {selectedEq.owner_nama_usaha}</div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deskripsi Alat</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEq.deskripsi || 'Tidak ada deskripsi.'}</p>
            </div>
            
            <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 mb-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="text-cyan-600">📝</span> Form Peminjaman Internal</h3>
              
              {currentUserVerifikasi !== 'terverifikasi' ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
                  Lengkapi verifikasi akun terlebih dahulu. <a href="/profil" className="underline font-bold">Ke Profil</a>
                </div>
              ) : (
                <form onSubmit={handleKirimRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durasi Negosiasi (Hari/Minggu)</label>
                    <input 
                      type="text" 
                      value={durasi}
                      onChange={(e) => setDurasi(e.target.value)}
                      placeholder="Contoh: 3 Hari, mulai tanggal..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-600 bg-white"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Mengajukan...' : 'Ajukan Kontrak Sewa'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
