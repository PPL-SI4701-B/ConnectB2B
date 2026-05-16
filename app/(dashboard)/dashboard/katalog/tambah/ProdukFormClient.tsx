'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, Save, X, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import NotificationBell from '@/components/layout/NotificationBell';

const SATUAN_OPTIONS = ['/ Pcs', '/ Lusin', '/ Kg', '/ Unit', '/ Hari', '/ Lumpsum'];

type Kategori = {
  id: number;
  nama_kategori: string;
};

type ProdukFormProps = {
  user: any;
  kategoriList: Kategori[];
  initialData?: any; // If editing
};

export default function ProdukFormClient({ user, kategoriList, initialData }: ProdukFormProps) {
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
  const [kategori, setKategori] = useState(initialData?.kategori || '');
  const [harga, setHarga] = useState<number | ''>(initialData?.harga ?? '');
  
  // Extract kapasitas and satuan from initialData deskripsi if needed (basic parsing strategy)
  // For simplicity, we just set empty for edit if not easily parsable, or parse it via regex
  // Let's assume initialData.deskripsi has structure, but we will fallback gracefully.
  const [kapasitas, setKapasitas] = useState('');
  const [satuan, setSatuan] = useState(SATUAN_OPTIONS[0]);
  const [deskripsiSingkat, setDeskripsiSingkat] = useState('');

  useEffect(() => {
    if (initialData?.deskripsi) {
      // Trying to parse custom format Kapasitas & Satuan
      const text = initialData.deskripsi as string;
      const kapasitasMatch = text.match(/Kapasitas:\s*(.*?)\n/);
      const satuanMatch = text.match(/Satuan:\s*(.*?)\n/);
      const spesifikasiMatch = text.match(/Spesifikasi:\n([\s\S]*)/);

      if (kapasitasMatch || satuanMatch || spesifikasiMatch) {
        if (kapasitasMatch) setKapasitas(kapasitasMatch[1]);
        if (satuanMatch) setSatuan(satuanMatch[1]);
        if (spesifikasiMatch) setDeskripsiSingkat(spesifikasiMatch[1]);
      } else {
        setDeskripsiSingkat(text); // fallback
      }
    }
  }, [initialData]);

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

    if (!initialData && !file) {
      setErrorMsg('Minimal 1 foto wajib diunggah.');
      return;
    }

    if (!kategori) {
      setErrorMsg('Kategori utama harus dipilih.');
      return;
    }

    if (harga === '' || harga < 0) {
      setErrorMsg('Harga tidak valid.');
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

      // 2. Siapkan data deskripsi gabungan
      const finalDeskripsi = `Kapasitas: ${kapasitas}\nSatuan: ${satuan}\n\nSpesifikasi:\n${deskripsiSingkat}`;

      // 3. Simpan ke database
      const produkPayload = {
        user_id: user.id,
        nama,
        kategori,
        harga: Number(harga),
        deskripsi: finalDeskripsi,
        gambar_url: finalGambarUrl,
        stok: initialData?.stok || 0 // Default
      };

      if (initialData) {
        // Edit Row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('produk')
          .update(produkPayload)
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        // Insert new Row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('produk')
          .insert([produkPayload]);

        if (error) throw error;
      }

      // Redirect balik ke katalog
      router.push('/dashboard/katalog');
      router.refresh();

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan produk.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-black">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">
            <Link href="/dashboard/katalog" className="hover:underline">Katalog Produk</Link> / {initialData ? 'Edit ProduK' : 'Tambah Baru'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{initialData ? 'Edit Item Portofolio' : 'Tambah Item Portofolio Baru'}</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto Pendukung Produk / Alat <span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Item Jasa/Produk <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: Maklon Kemeja Drill"
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Utama <span className="text-red-500">*</span></label>
                <select 
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  required
                >
                  <option value="" disabled>Pilih Kategori...</option>
                  {kategoriList.map(cat => (
                    <option key={cat.id} value={cat.nama_kategori}>{cat.nama_kategori}</option>
                  ))}
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rentang Kapasitas / Skala</label>
                <input 
                  type="text" 
                  value={kapasitas}
                  onChange={(e) => setKapasitas(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: Hingga 500 pcs/minggu" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimasi Harga (Rp) <span className="text-red-500">*</span></label>
                <div className="flex gap-2 text-black">
                  <input 
                    type="number" 
                    value={harga}
                    onChange={(e) => setHarga(Number(e.target.value))}
                    className="w-2/3 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                    placeholder="150000" 
                    min="0"
                    required 
                  />
                  <select 
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    className="w-1/3 px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all text-black"
                  >
                    {SATUAN_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Lengkap Spesifikasi</label>
            <textarea 
              value={deskripsiSingkat}
              onChange={(e) => setDeskripsiSingkat(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
              rows={5} 
              placeholder="Tuliskan penjelasan kualifikasi jasa, bahan baku buatan, dan detail lainnya..." 
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
                  Simpan ke Portofolio
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
