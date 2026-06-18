'use client';

import { useState } from 'react';
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  CheckCheck,
  AlertCircle,
  ArrowRightLeft,
} from 'lucide-react';
import type { RequestSayaItem } from './page';

type TabKey = 'semua' | 'pending' | 'approve' | 'negosiasi' | 'ditolak';

const TAB_LIST: { key: TabKey; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'approve', label: 'Disetujui' },
  { key: 'negosiasi', label: 'Negosiasi' },
  { key: 'ditolak', label: 'Ditolak' },
];

function getReqStatusConfig(status: string) {
  switch (status?.toLowerCase()) {
    case 'approve':
      return { label: 'Disetujui', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: <CheckCircle className="w-3.5 h-3.5" /> };
    case 'pending':
      return { label: 'Menunggu', bg: 'bg-amber-50', text: 'text-amber-600', icon: <Clock className="w-3.5 h-3.5" /> };
    case 'negosiasi':
      return { label: 'Negosiasi', bg: 'bg-indigo-50', text: 'text-indigo-600', icon: <MessageSquare className="w-3.5 h-3.5" /> };
    case 'ditolak':
      return { label: 'Ditolak', bg: 'bg-rose-50', text: 'text-rose-600', icon: <XCircle className="w-3.5 h-3.5" /> };
    case 'selesai':
      return { label: 'Selesai', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCheck className="w-3.5 h-3.5" /> };
    default:
      return { label: status || 'Diproses', bg: 'bg-slate-50', text: 'text-slate-600', icon: <AlertCircle className="w-3.5 h-3.5" /> };
  }
}

function getTrxStatusConfig(status: string | null, selesai: string | null) {
  if (selesai) return { label: 'Selesai', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCheck className="w-3 h-3" /> };
  if (!status) return null;
  if (status === 'lunas') return { label: 'Lunas / Aktif', bg: 'bg-teal-50', text: 'text-teal-600', icon: <CheckCircle className="w-3 h-3" /> };
  if (status === 'belum lunas') return { label: 'Menunggu Bayar', bg: 'bg-amber-50', text: 'text-amber-600', icon: <Clock className="w-3 h-3" /> };
  return { label: status, bg: 'bg-slate-50', text: 'text-slate-600', icon: <ArrowRightLeft className="w-3 h-3" /> };
}

const formatDate = (d: string | null) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function RequestSayaClient({ items }: { items: RequestSayaItem[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>('semua');
  const [search, setSearch] = useState('');

  const filtered = items.filter(item => {
    const matchTab =
      activeTab === 'semua' ||
      item.statusRequest?.toLowerCase() === activeTab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.umkmNama.toLowerCase().includes(q) ||
      item.pesan.toLowerCase().includes(q) ||
      item.reqCode.toLowerCase().includes(q) ||
      (item.trxCode || '').toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts: Record<TabKey, number> = {
    semua: items.length,
    pending: items.filter(i => i.statusRequest === 'pending').length,
    approve: items.filter(i => i.statusRequest === 'approve').length,
    negosiasi: items.filter(i => i.statusRequest === 'negosiasi').length,
    ditolak: items.filter(i => i.statusRequest === 'ditolak').length,
  };

  return (
    <div className="space-y-6">
      {/* Stat ring */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-card-bg rounded-xl p-5 shadow-sm">
          <p className="text-text-muted text-[13px] font-medium mb-1">Total Request</p>
          <p className="text-[28px] font-bold text-text-main">{counts.semua}</p>
        </div>
        <div className="bg-card-bg rounded-xl p-5 shadow-sm">
          <p className="text-text-muted text-[13px] font-medium mb-1">Disetujui</p>
          <p className="text-[28px] font-bold text-emerald-600">{counts.approve}</p>
        </div>
        <div className="bg-card-bg rounded-xl p-5 shadow-sm">
          <p className="text-text-muted text-[13px] font-medium mb-1">Menunggu</p>
          <p className="text-[28px] font-bold text-amber-500">{counts.pending}</p>
        </div>
        <div className="bg-card-bg rounded-xl p-5 shadow-sm">
          <p className="text-text-muted text-[13px] font-medium mb-1">Ditolak</p>
          <p className="text-[28px] font-bold text-rose-500">{counts.ditolak}</p>
        </div>
      </div>

      {/* Card utama */}
      <div className="bg-card-bg rounded-xl shadow-sm p-[30px]">
        {/* Search + Tab */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Cari request, UMKM, atau ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-color bg-bg-color text-[14px] text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {TAB_LIST.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  activeTab === t.key
                    ? 'bg-secondary text-white'
                    : 'bg-bg-color text-text-muted hover:bg-border-color/40'
                }`}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white/20 text-white' : 'bg-border-color text-text-muted'}`}>
                    {counts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">#REQ</th>
                <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">UMKM Dituju</th>
                <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">Jenis Kerja Sama</th>
                <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">Tgl. Request</th>
                <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">Status Request</th>
                <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">#TRX</th>
                <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color pr-4">Tgl. Mulai</th>
                <th className="text-text-muted font-semibold text-[13px] pb-4 border-b border-border-color">Status Transaksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(item => {
                const reqCfg = getReqStatusConfig(item.statusRequest);
                const trxCfg = getTrxStatusConfig(item.statusTrx, item.tanggalSelesai);
                return (
                  <tr key={item.reqId} className="hover:bg-[#f8fafc] transition-colors group">
                    <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                      <span className="font-bold text-secondary text-[14px]">{item.reqCode}</span>
                    </td>
                    <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-bg-color text-secondary font-bold text-[12px] flex items-center justify-center shrink-0">
                          {item.umkmInitials}
                        </div>
                        <span className="font-semibold text-[14px] text-text-main">{item.umkmNama}</span>
                      </div>
                    </td>
                    <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                      <span className="text-[13px] text-text-muted block truncate max-w-[160px]">{item.pesan}</span>
                    </td>
                    <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                      <span className="text-[13px] text-text-muted">{formatDate(item.tanggalRequest)}</span>
                    </td>
                    <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${reqCfg.bg} ${reqCfg.text}`}>
                        {reqCfg.icon}
                        {reqCfg.label}
                      </span>
                    </td>
                    <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                      {item.trxCode ? (
                        <span className="font-bold text-primary text-[14px]">{item.trxCode}</span>
                      ) : (
                        <span className="text-text-muted text-[13px]">—</span>
                      )}
                    </td>
                    <td className="py-4 border-b border-border-color pr-4 group-last:border-none">
                      <span className="text-[13px] text-text-muted">{formatDate(item.tanggalMulai)}</span>
                    </td>
                    <td className="py-4 border-b border-border-color group-last:border-none">
                      {trxCfg ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${trxCfg.bg} ${trxCfg.text}`}>
                          {trxCfg.icon}
                          {trxCfg.label}
                        </span>
                      ) : (
                        <span className="text-text-muted text-[13px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted text-[15px]">
                    {search ? `Tidak ada request yang cocok dengan "${search}".` : 'Belum ada request untuk kategori ini.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
