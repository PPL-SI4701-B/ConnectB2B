'use client';

import { useState, useTransition } from 'react';
import { ShieldOff, ShieldCheck, Search } from 'lucide-react';
import { blockUser, unblockUser } from '@/app/actions/admin-actions';
import { useRouter } from 'next/navigation';

export interface AdminUserItem {
  id: string;
  nama: string;
  email: string;
  role: string;
  status_verifikasi: string;
  is_blocked: boolean;
  created_at: string;
}

export default function UserManagementTable({ users }: { users: AdminUserItem[] }) {
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = users.filter(u =>
    u.nama?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBlock = (userId: string) => {
    if (!confirm('Yakin ingin memblokir pengguna ini? Mereka tidak akan bisa login.')) return;
    setLoadingId(userId);
    startTransition(async () => {
      const result = await blockUser(userId);
      setLoadingId(null);
      if (!result.success) {
        alert(result.error || 'Gagal memblokir pengguna.');
      } else {
        router.refresh();
      }
    });
  };

  const handleUnblock = (userId: string) => {
    setLoadingId(userId);
    startTransition(async () => {
      const result = await unblockUser(userId);
      setLoadingId(null);
      if (!result.success) {
        alert(result.error || 'Gagal membuka blokir pengguna.');
      } else {
        router.refresh();
      }
    });
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return 'bg-purple-100 text-purple-700';
    if (role === 'umkm') return 'bg-blue-100 text-blue-700';
    if (role === 'industri') return 'bg-indigo-100 text-indigo-700';
    return 'bg-slate-100 text-slate-600';
  };

  const getVerifBadge = (status: string) => {
    if (status === 'terverifikasi') return 'bg-emerald-50 text-emerald-700';
    if (status === 'menunggu') return 'bg-amber-50 text-amber-700';
    if (status === 'ditolak') return 'bg-red-50 text-red-700';
    return 'bg-slate-50 text-slate-500';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, atau role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400"
          />
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} pengguna</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <th className="px-5 py-3 text-left">Pengguna</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-left">Verifikasi</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Bergabung</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                  Tidak ada pengguna ditemukan.
                </td>
              </tr>
            ) : (
              filtered.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.is_blocked ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">{u.nama || '—'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getVerifBadge(u.status_verifikasi)}`}>
                      {u.status_verifikasi || 'belum'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {u.is_blocked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold">
                        <ShieldOff className="w-3 h-3" /> Diblokir
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {u.role !== 'admin' && (
                      u.is_blocked ? (
                        <button
                          onClick={() => handleUnblock(u.id)}
                          disabled={loadingId === u.id || isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {loadingId === u.id ? 'Memproses...' : 'Buka Blokir'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlock(u.id)}
                          disabled={loadingId === u.id || isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border border-red-200"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          {loadingId === u.id ? 'Memproses...' : 'Blokir'}
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
