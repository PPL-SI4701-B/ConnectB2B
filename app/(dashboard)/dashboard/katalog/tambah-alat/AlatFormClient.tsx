'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import NotificationBell from '@/components/layout/NotificationBell';

type AlatFormProps = {
  user: any;
  initialData?: any; // If editing
};

export default function AlatFormClient({ user, initialData }: AlatFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.gambar_url || null);
  const [isDragging, setIsDragging] = useState(false);

  // Form State
  const [nama, setNama] = useState(initialData?.nama || '');
  const [hargaSewa, setHargaSewa] = useState<number | ''>(initialData?.harga_sewa ?? '');
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi || '');
  const [status, setStatus] = useState(initialData?.status || 'tersedia');
  const [stok, setStok] = useState<number | ''>(initialData?.stok ?? 1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    validateAndSetFile(selected);
  };

  const validateAndSetFile = (selected?: File) => {
    setErrorMsg('');
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5MB');
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selected.type)) {
      setErrorMsg('Format file hanya boleh JPG, PNG, atau WEBP');
      return;
    }
    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    validateAndSetFile(dropped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (hargaSewa === '' || hargaSewa < 0) {
      setErrorMsg('Harga sewa tidak valid.');
      return;
    }

    if (stok === '' || stok < 0) {
      setErrorMsg('Stok tidak valid.');
      return;
    }

    setIsLoading(true);

    try {
      let finalGambarUrl = previewUrl;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('produk-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('produk-images')
          .getPublicUrl(filePath);

        finalGambarUrl = publicUrlData.publicUrl;
      } else if (previewUrl && previewUrl.startsWith('blob:')) {
        finalGambarUrl = initialData?.gambar_url || null;
      }

      // Deteksi kata terlarang (replika, palsu, duplikat, clone, tiruan, kw)
      const cleanNama = (nama || '').toLowerCase();
      const cleanDeskripsi = (deskripsi || '').toLowerCase();
      const forbiddenPattern = /\b(replika|palsu|duplikat|clone|tiruan|kw|kw\d+)\b/i;
      const isViolating = forbiddenPattern.test(cleanNama) || forbiddenPattern.test(cleanDeskripsi);

      const equipmentPayload = {
        user_id: user.id,
        nama,
        harga_sewa: Number(hargaSewa),
        deskripsi,
        status,
        stok: Number(stok),
        gambar_url: finalGambarUrl,
        is_active: initialData ? initialData.is_active : true,
      };

      let savedAlat: any = null;
      if (initialData) {
        // Edit Row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('equipment')
          .update(equipmentPayload)
          .eq('id', initialData.id)
          .select();

        if (error) throw error;
        savedAlat = data?.[0];
      } else {
        // Insert new Row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('equipment')
          .insert([equipmentPayload])
          .select();

        if (error) throw error;
        savedAlat = data?.[0];
      }

      if (isViolating && savedAlat) {
        // Buat laporan ke laporan_konten
        const { error: reportError } = await supabase
          .from('laporan_konten')
          .insert({
            katalog_type: 'equipment',
            katalog_id: savedAlat.id,
            pelapor: 'Sistem (Auto-Moderasi)',
            alasan: 'Terdeteksi kata terlarang (replika/palsu/duplikat/clone/tiruan/kw) pada nama atau deskripsi.',
            severity: 'berat',
            status: 'pending'
          });
        if (reportError) console.error('Error inserting report:', reportError);

        // Cari admin untuk diberi notifikasi
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await supabase.rpc('kirim_notifikasi', {
              p_target_user_id: admin.id,
              p_pesan: `Moderasi: Alat/Mesin "${nama}" oleh UMKM terindikasi melanggar ketentuan.`
            });
          }
        }
      } else if (!isViolating && initialData) {
        // Jika alat/mesin yang diedit sekarang sudah bersih dari kata terlarang, selesaikan laporan pending-nya
        const { error: resolveError } = await supabase
          .from('laporan_konten')
          .update({ status: 'diabaikan' })
          .eq('katalog_id', initialData.id)
          .eq('katalog_type', 'equipment')
          .eq('status', 'pending');
        if (resolveError) console.error('Error resolving reports:', resolveError);
      }

      // Redirect balik ke katalog
      router.push('/dashboard/katalog');
      router.refresh();

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan alat/mesin.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-black">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">
            <Link href="/dashboard/katalog" className="hover:underline">Katalog Produk</Link> / {initialData ? 'Edit Alat' : 'Tambah Baru'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{initialData ? 'Edit Alat/Mesin Produksi' : 'Tambah Alat/Mesin Produksi Baru'}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationBell />
          <img src="https://ui-avatars.com/api/?name=User&background=4318ff&color=fff" alt="Profile" className="w-10 h-10 rounded-full ml-2 cursor-pointer object-cover shadow-sm ring-2 ring-gray-100" />
        </div>
      </header>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          <p className="font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto Pendukung Alat/Mesin <span className="text-gray-400 font-normal">(Opsional)</span></label>
            {!previewUrl ? (
              <div 
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/50'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 mx-auto text-indigo-500 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">Klik untuk unggah atau seret file ke area ini</h3>
                <p className="text-gray-500 text-sm">Format yang didukung: JPG, PNG, WEBP (Maksimal 5MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="relative inline-block">
                <img src={previewUrl} alt="Preview" className="h-48 w-48 object-cover rounded-xl border border-gray-200 shadow-sm" />
                <button 
                  type="button" 
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Alat/Mesin <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: Mesin Jahit Singer"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Ketersediaan <span className="text-red-500">*</span></label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  required
                >
                  <option value="tersedia">Tersedia</option>
                  <option value="tidak tersedia">Tidak Tersedia</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok/Jumlah Unit</label>
                <input 
                  type="number" 
                  value={stok}
                  onChange={(e) => setStok(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: 5" 
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimasi Harga Sewa (Rp / Hari) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  value={hargaSewa}
                  onChange={(e) => setHargaSewa(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  placeholder="150000" 
                  min="0"
                  required 
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi & Spesifikasi Lengkap</label>
            <textarea 
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
              rows={5} 
              placeholder="Tuliskan spesifikasi mesin, daya listrik yang dibutuhkan, dan detail lainnya..." 
            />
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <Link href="/dashboard/katalog" className="px-5 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Batal & Kembali
            </Link>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-w-[180px]"
            >
              {isLoading ? 'Menyimpan...' : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan ke Katalog
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
