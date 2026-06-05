'use client';

import { useState } from 'react';
import { blockUser, unblockUser } from '@/app/actions/admin-actions';
import { Search, ShieldOff, ShieldCheck, AlertCircle, CheckCircle, X, ChevronRight, Lock, Unlock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  nama: string; // The owner name or primary username
  email: string;
  role: string;
  status_verifikasi: string;
  is_blocked: boolean;
  businessName: string | null;
}

export default function KelolaPenggunaClient({ initialUsers }: { initialUsers: UserData[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Semua' | 'UMKM' | 'Industri'>('Semua');
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; action: 'block' | 'unblock'; user: UserData | null }>({
    isOpen: false,
    action: 'block',
    user: null
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAction = async () => {
    if (!confirmModal.user) return;
    const { action, user } = confirmModal;
    
    setLoadingAction(user.id);
    setConfirmModal({ isOpen: false, action: 'block', user: null });
    
    try {
      if (action === 'block') {
        const res = await blockUser(user.id);
        if (res.success) {
          showToast('Akun berhasil diblokir.', 'success');
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_blocked: true } : u));
          router.refresh();
        } else {
          showToast(res.error || 'Gagal memblokir akun.', 'error');
        }
      } else {
        const res = await unblockUser(user.id);
        if (res.success) {
          showToast('Blokir akun berhasil dicabut.', 'success');
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_blocked: false } : u));
          router.refresh();
        } else {
          showToast(res.error || 'Gagal mencabut blokir.', 'error');
        }
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan sistem.', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      (u.businessName?.toLowerCase() || '').includes(searchLower) ||
      u.nama.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower);
      
    const matchRole = roleFilter === 'Semua' || u.role.toLowerCase() === roleFilter.toLowerCase();
    const matchBlocked = showBlockedOnly ? u.is_blocked : true;
    
    return matchSearch && matchRole && matchBlocked;
  });

  return (
    <div className="bg-bg-color min-h-screen text-text-main font-sans w-full overflow-hidden">
      <div className="p-8 max-w-[1400px] mx-auto w-full">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border backdrop-blur-sm ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
                : 'bg-red-50/95 border-red-200 text-red-800'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              )}
              <p className="text-[14px] font-semibold">{toast.message}</p>
              <button onClick={() => setToast(null)} className="ml-3 opacity-50 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi */}
        {confirmModal.isOpen && confirmModal.user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${confirmModal.action === 'block' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {confirmModal.action === 'block' ? <Lock className="w-7 h-7" /> : <Unlock className="w-7 h-7" />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {confirmModal.action === 'block' ? 'Yakin ingin memblokir akun ini?' : 'Yakin ingin mencabut blokir?'}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {confirmModal.action === 'block' 
                    ? `Akun ${confirmModal.user.businessName || confirmModal.user.nama} tidak akan bisa login ke sistem jika diblokir.`
                    : `Akun ${confirmModal.user.businessName || confirmModal.user.nama} akan kembali aktif dan dapat login kembali.`}
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setConfirmModal({ isOpen: false, action: 'block', user: null })}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleAction}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors ${
                      confirmModal.action === 'block' 
                        ? 'bg-rose-600 hover:bg-rose-700' 
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {confirmModal.action === 'block' ? 'Ya, Blokir Akun' : 'Ya, Cabut Blokir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-[13px] font-medium text-text-muted mb-1 flex items-center gap-2">
                <span>Dashboard Admin</span> <ChevronRight className="w-3.5 h-3.5" /> <span className="text-secondary font-semibold">Manajemen Akun</span>
              </div>
              <h1 className="text-[28px] font-bold text-text-main">Manajemen Akun & Autorisasi</h1>
              <p className="text-text-muted text-[14px] mt-1">Kelola akses, blokir pengguna melanggar, dan pantau status seluruh entitas ConnectB2B.</p>
            </div>
            
            <button
              onClick={() => setShowBlockedOnly(!showBlockedOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-bold transition-all ${
                showBlockedOnly 
                  ? 'bg-rose-50 border-rose-200 text-rose-600' 
                  : 'bg-white border-border-color text-text-muted hover:text-text-main'
              }`}
            >
              {showBlockedOnly ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
              {showBlockedOnly ? 'Tampilkan Semua Akun' : 'Lihat Akun Diblokir'}
            </button>
          </div>
        </header>

        <div className="bg-card-bg border border-border-color rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border-color bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="font-bold text-[16px] text-text-main flex items-center gap-2">
              Database Pengelola Terdaftar
              <span className="px-2 py-0.5 bg-blue-100 text-secondary rounded-full text-[12px] font-bold">{filteredUsers.length}</span>
            </h2>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Filter Role */}
              <div className="flex bg-white rounded-lg p-1 border border-border-color">
                {['Semua', 'UMKM', 'Industri'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRoleFilter(tab as any)}
                    className={`px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
                      roleFilter === tab 
                        ? 'bg-slate-100 text-text-main shadow-sm' 
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari nama perusahaan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-border-color rounded-lg pl-9 pr-4 py-2 text-[13px] font-medium outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all placeholder:text-text-muted"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-white border-b border-border-color text-text-muted font-semibold">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">ID User</th>
                  <th className="px-6 py-4">Nama Usaha / Email</th>
                  <th className="px-6 py-4">Tingkat Akses</th>
                  <th className="px-6 py-4">Status Akun</th>
                  <th className="px-6 py-4 text-right">Aksi Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-[12px] text-text-muted">
                        {user.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[14px] text-text-main mb-0.5">{user.businessName || user.nama}</div>
                        <div className="text-[12px] text-text-muted">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold capitalize border ${
                          user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          user.role === 'industri' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_blocked ? (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 text-[12px] font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></div>
                            Diblokir
                          </span>
                        ) : user.status_verifikasi === 'terverifikasi' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[12px] font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 text-[12px] font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            {user.status_verifikasi === 'menunggu' ? 'Menunggu Verifikasi' : 'Ditolak'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              action: user.is_blocked ? 'unblock' : 'block',
                              user
                            })}
                            disabled={loadingAction === user.id}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all shadow-sm ${
                              user.is_blocked 
                                ? 'bg-white border border-border-color text-text-main hover:bg-slate-50' 
                                : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'
                            } disabled:opacity-50`}
                          >
                            {loadingAction === user.id ? (
                              <span className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${user.is_blocked ? 'border-text-main' : 'border-rose-600'}`}></span>
                            ) : user.is_blocked ? (
                              <>
                                <Unlock className="w-4 h-4" />
                                <span>Cabut Blokir</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                <span>Blokir Akun</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                      <ShieldOff className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold text-[14px]">Tidak ada pengguna ditemukan.</p>
                      <p className="text-[13px] mt-1">Coba sesuaikan pencarian atau filter Anda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
