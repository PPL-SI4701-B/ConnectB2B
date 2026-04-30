'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Camera, Pencil, CheckCircle, FileText, Upload, AlertCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfileClient({
  userId,
  userEmail,
  userName,
  role,
  statusVerifikasi,
  profileData,
  entityData,
  categories,
  documents
}: any) {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [namaUsaha, setNamaUsaha] = useState(
    entityData?.nama_usaha || entityData?.nama_perusahaan || userName || ''
  );
  const [kategoriId, setKategoriId] = useState<number | ''>(entityData?.kategori_id || '');
  const [emailKontak, setEmailKontak] = useState(userEmail || '');
  const [alamat, setAlamat] = useState(entityData?.alamat || entityData?.lokasi || profileData?.lokasi || '');
  const [nomorTelepon, setNomorTelepon] = useState(profileData?.kontak || '');

  // Image State
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if images exist by getting their public URLs and appending a timestamp to bypass cache
    const timestamp = new Date().getTime();
    
    const fetchImages = async () => {
      const { data: avatarData } = supabase.storage.from('avatars').getPublicUrl(`${userId}/profile.jpg`);
      // Optional: you could check if file actually exists before setting it, but getPublicUrl doesn't check existence.
      // If the file doesn't exist, it might show a broken image, so let's just use it and rely on onError to show fallback
      setAvatarUrl(`${avatarData.publicUrl}?t=${timestamp}`);
      
      const { data: coverData } = supabase.storage.from('avatars').getPublicUrl(`${userId}/cover.jpg`);
      setCoverUrl(`${coverData.publicUrl}?t=${timestamp}`);
    };
    
    fetchImages();
  }, [userId, supabase]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const path = `${userId}/${type}.jpg`;

    setIsLoading(true);
    try {
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      // Update the URL with a new timestamp to refresh the image
      const timestamp = new Date().getTime();
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      
      if (type === 'profile') {
        setAvatarUrl(`${data.publicUrl}?t=${timestamp}`);
      } else {
        setCoverUrl(`${data.publicUrl}?t=${timestamp}`);
      }
      
      showToast(`Berhasil mengubah foto ${type === 'profile' ? 'profil' : 'cover'}`, 'success');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showToast(`Gagal mengunggah foto: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // 1. Update Profiles table
      const profilePayload = {
        user_id: userId,
        kontak: nomorTelepon,
        lokasi: alamat
      };

      if (profileData?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('user_id', userId);
        if (profileError) throw profileError;
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profilePayload]);
        if (profileError) throw profileError;
      }

      // 2. Update UMKM or Industri table
      if (role === 'umkm') {
        const payload = {
          nama_usaha: namaUsaha,
          kategori_id: kategoriId === '' ? null : kategoriId,
          alamat: alamat
        };
        if (entityData?.id) {
          const { error } = await supabase.from('umkm').update(payload).eq('user_id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('umkm').insert([{ user_id: userId, ...payload }]);
          if (error) throw error;
        }
      } else if (role === 'industri') {
        const payload = {
          nama_perusahaan: namaUsaha,
          kategori_id: kategoriId === '' ? null : kategoriId,
          lokasi: alamat
        };
        if (entityData?.id) {
          const { error } = await supabase.from('industri').update(payload).eq('user_id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('industri').insert([{ user_id: userId, ...payload }]);
          if (error) throw error;
        }
      }

      showToast('Profil berhasil diperbarui!', 'success');
      router.refresh(); // Refresh server data
    } catch (error: any) {
      console.error('Error saving profile:', error);
      showToast('Gagal menyimpan profil: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNamaUsaha(entityData?.nama_usaha || entityData?.nama_perusahaan || userName || '');
    setKategoriId(entityData?.kategori_id || '');
    setEmailKontak(userEmail || '');
    setAlamat(entityData?.alamat || entityData?.lokasi || profileData?.lokasi || '');
    setNomorTelepon(profileData?.kontak || '');
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} transition-all`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-4 hover:text-gray-200">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">Halaman / Profil</p>
        <h1 className="text-2xl font-bold text-gray-900">Kelola Profil Usaha</h1>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover Photo */}
        <div className="h-40 bg-gradient-to-br from-indigo-500 to-cyan-400 relative">
          {coverUrl && (
            <img 
              src={coverUrl} 
              alt="Cover" 
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <input 
            type="file" 
            ref={coverInputRef} 
            onChange={(e) => handleImageUpload(e, 'cover')} 
            className="hidden" 
            accept="image/*" 
          />
          <button 
            onClick={() => coverInputRef.current?.click()}
            disabled={isLoading}
            className="absolute right-4 top-4 bg-black/30 hover:bg-black/40 text-white backdrop-blur-sm border border-white/20 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Camera className="w-4 h-4" /> Ubah Cover
          </button>
        </div>

        <div className="px-8 pb-8">
          {/* Avatar & Status */}
          <div className="flex justify-between items-end -mt-12 mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to UI Avatar if broken
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(namaUsaha)}&background=fff&color=4f46e5&size=150`;
                    }}
                  />
                ) : (
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(namaUsaha)}&background=fff&color=4f46e5&size=150`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={(e) => handleImageUpload(e, 'profile')} 
                className="hidden" 
                accept="image/*" 
              />
              <button 
                onClick={() => avatarInputRef.current?.click()}
                disabled={isLoading}
                className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2 rounded-full shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>

            <div>
              {statusVerifikasi === 'terverifikasi' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium border border-green-200">
                  <CheckCircle className="w-4 h-4" /> {role === 'industri' ? 'Industri' : 'UMKM'} Terverifikasi
                </span>
              ) : statusVerifikasi === 'ditolak' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium border border-red-200">
                  <AlertCircle className="w-4 h-4" /> Verifikasi Ditolak
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium border border-yellow-200">
                  <AlertCircle className="w-4 h-4" /> Menunggu Verifikasi
                </span>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Usaha</label>
                <input 
                  type="text" 
                  value={namaUsaha}
                  onChange={(e) => setNamaUsaha(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Kontak</label>
                <input 
                  type="email" 
                  value={emailKontak}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                  title="Email ini terkait dengan akun Anda dan tidak dapat diubah di sini."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input 
                  type="text" 
                  value={nomorTelepon}
                  onChange={(e) => setNomorTelepon(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="+62 8xx xxxx xxxx"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Bisnis</label>
                <select 
                  value={kategoriId}
                  onChange={(e) => setKategoriId(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.nama_kategori}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                <textarea 
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  placeholder="Masukkan alamat lengkap..."
                />
              </div>
            </div>
          </div>

          <hr className="my-8 border-gray-100" />

          {/* Document Section (from mockup) */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Dokumen Pendukung Usaha</h3>
            <p className="text-sm text-gray-500 mb-6">Kelola dokumen perizinan Anda agar tim Admin dapat memverifikasi status badan usaha Anda.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Note: This is an overview as per mockup, full document upload would typically go through a different component or route as per FR-27. */}
              {['NIB', 'NPWP'].map((docType) => {
                const existingDoc = documents.find((d: any) => d.jenis_dokumen === docType);
                return (
                  <div key={docType} className={`border-2 border-dashed ${existingDoc ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'} rounded-xl p-6 text-center transition-all`}>
                    {existingDoc ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                        <h4 className="font-semibold text-gray-900 mb-1">{docType} Terunggah</h4>
                        <p className="text-xs text-green-600 font-medium capitalize">Status: {existingDoc.status_verifikasi}</p>
                      </>
                    ) : (
                      <>
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                        <h4 className="font-semibold text-gray-900 mb-1">Unggah {docType}</h4>
                        <p className="text-xs text-gray-500">Belum ada dokumen</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {statusVerifikasi === 'terverifikasi' && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="text-emerald-500 w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-700 block">Status: Berkas Lengkap & Terverifikasi</strong>
                  <p className="text-sm text-emerald-600/80 mt-1">Dokumen Anda telah diperiksa dan disetujui. Anda mendapatkan akses penuh ke platform.</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button 
              onClick={handleCancel}
              disabled={isLoading}
              className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
