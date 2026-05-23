'use client';

import { useState } from 'react';
import { Search, ArrowRightLeft, Clock, CheckCircle, AlertCircle, Inbox, History, Info } from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';

interface TransaksiItem {
  id: number;
  trxCode: string;
  status: string;
  statusValidasi: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  progressStatus: string;
  history: any[];
  pesan: string;
  mitraNama: string;
}

export default function TransaksiIndustriClient({
  transaksi,
  industriName,
}: {
  transaksi: TransaksiItem[];
  industriName: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'berjalan' | 'pembayaran' | 'selesai'>('berjalan');

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiItem | null>(null);

  const filtered = transaksi.filter(t =>
    t.trxCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.mitraNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.pesan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const sedangBerjalan = filtered.filter(t => t.status === 'belum lunas' && t.statusValidasi === 'menunggu');
  const menungguPembayaran = filtered.filter(t => t.status === 'belum lunas' && t.statusValidasi !== 'menunggu');
  const selesai = filtered.filter(t => t.status === 'lunas');

  const tabs = [
    { key: 'berjalan' as const, label: 'Sedang Berjalan', count: sedangBerjalan.length },
    { key: 'pembayaran' as const, label: 'Menunggu Pembayaran', count: menungguPembayaran.length },
    { key: 'selesai' as const, label: 'Selesai', count: selesai.length },
  ];

  const currentList = activeTab === 'berjalan' ? sedangBerjalan
    : activeTab === 'pembayaran' ? menungguPembayaran
    : selesai;

  const getStatusBadge = (t: TransaksiItem) => {
    if (t.status === 'lunas') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
          <CheckCircle className="w-3 h-3" />
          Selesai
        </span>
      );
    }
    if (t.statusValidasi === 'menunggu') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold">
          <Clock className="w-3 h-3" />
          Diproses
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold">
        <AlertCircle className="w-3 h-3" />
        Belum Dibayar
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full bg-bg-color min-h-screen">
      <div className="p-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 bg-transparent">
          <div>
            <div className="text-[14px] font-medium text-text-muted mb-1">Halaman / Pantau Transaksi</div>
            <h1 className="text-[32px] font-bold text-text-main">Manajemen Transaksi</h1>
            <p className="text-text-muted text-[15px] mt-1">Pantau progres kerja sama, pembayaran, dan ulasan proyek.</p>
          </div>

          <div className="flex items-center gap-5 bg-card-bg px-5 py-2.5 rounded-[30px] shadow-sm">
            <div className="flex items-center bg-bg-color px-5 py-2.5 rounded-[20px] gap-2.5">
              <Search className="w-5 h-5 text-text-muted" />
              <input
                type="text"
                placeholder="Cari ID Transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-text-main font-medium w-[160px] text-[15px] placeholder:text-text-muted"
              />
            </div>
            <NotificationBell />
            <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold cursor-pointer border-2 border-white shadow-sm">
              {industriName.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 bg-card-bg rounded-xl p-1.5 shadow-sm mb-8 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-lg font-semibold text-[14px] transition-all ${
                activeTab === tab.key
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-text-muted hover:bg-bg-color hover:text-text-main'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="space-y-4">
          {currentList.length > 0 ? (
            currentList.map(t => (
              <div
                key={t.id}
                className={`bg-card-bg rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-transparent hover:border-blue-100 ${
                  t.status === 'lunas' ? 'opacity-80' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <div className="font-bold text-secondary text-[15px]">{t.trxCode}</div>
                    {getStatusBadge(t)}
                    <span className="text-[13px] text-text-muted">{formatDate(t.tanggalMulai)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[14px] font-bold text-text-main mb-1 line-clamp-1 max-w-[500px]">
                      {t.pesan}
                    </div>
                    <div className="text-[13px] text-text-muted mb-2">
                      Mitra: {t.mitraNama}
                    </div>
                    {activeTab === 'berjalan' && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-secondary rounded-lg text-[13px] font-semibold">
                        <Info className="w-4 h-4" />
                        Progres: {t.progressStatus || 'Menunggu Material'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTransaksi(t);
                        setHistoryModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 border border-border-color text-text-muted hover:bg-bg-color rounded-lg text-[13px] font-semibold transition-colors"
                    >
                      <History className="w-4 h-4" /> History
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-bg-color rounded-lg text-[13px] font-medium text-text-muted">
                      <ArrowRightLeft className="w-4 h-4" />
                      {t.status === 'lunas' ? 'Transaksi Selesai' : 'Sedang Berlangsung'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-card-bg rounded-xl shadow-sm p-16 text-center">
              <div className="w-20 h-20 bg-bg-color rounded-full flex items-center justify-center mx-auto mb-5">
                <Inbox className="w-10 h-10 text-border-color" />
              </div>
              <div className="font-bold text-[18px] text-text-muted mb-2">
                Belum ada transaksi
              </div>
              <p className="text-text-muted text-[14px]">
                Transaksi akan muncul di sini setelah request kerja sama Anda diterima oleh Mitra.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {historyModalOpen && selectedTransaksi && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border-color">
              <h3 className="font-bold text-[18px]">Timeline Progres</h3>
              <button onClick={() => setHistoryModalOpen(false)} className="text-text-muted hover:text-text-main">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-5 max-h-[400px] overflow-y-auto">
              {selectedTransaksi.history && selectedTransaksi.history.length > 0 ? (
                <div className="space-y-4">
                  {selectedTransaksi.history.map((h, i) => (
                    <div key={h.id} className="relative pl-6 border-l-2 border-border-color pb-4 last:border-0 last:pb-0">
                      <div className="absolute w-3 h-3 bg-secondary rounded-full -left-[7px] top-1"></div>
                      <div className="font-bold text-[14px] text-text-main">{h.status_progress}</div>
                      <div className="text-[12px] text-text-muted mb-1">{new Date(h.created_at).toLocaleString('id-ID')}</div>
                      {h.pesan && (
                        <div className="bg-bg-color p-3 rounded-lg text-[13px] text-text-main mt-2">
                          "{h.pesan}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted text-[14px]">
                  Belum ada update histori progres dari UMKM.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
