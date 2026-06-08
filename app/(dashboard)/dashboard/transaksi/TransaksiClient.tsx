'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRightLeft, Clock, CheckCircle, AlertCircle, Inbox, History, UploadCloud, FileText, Banknote, CheckCheck } from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';
import { updateTransaksiProgress } from '@/app/actions/transaksi-actions';
import { uploadBuktiKirimUmkm, uploadBuktiPengiriman, uploadBuktiTerimaUang } from './actions';
import { createClient } from '@/lib/supabase';

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
  industriId: number;
  industriNama: string;
  pembayaranId: number | null;
  pembayaranStatus: string | null;
  buktiPengiriman: string | null;
  statusPengiriman: string;
  buktiPembayaranUmkm: string | null;
  statusPencairan: string;
  buktiTerimaUang: string | null;
  buktiKirimUmkm: string | null;
  konfirmasiPenerimaan: boolean;
}

export default function TransaksiClient({
  transaksi,
  umkmName,
}: {
  transaksi: TransaksiItem[];
  umkmName: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pembayaran' | 'pengerjaan' | 'selesai'>('pembayaran');

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiItem | null>(null);
  const [newProgressStatus, setNewProgressStatus] = useState('Mesin Sedang Disiapkan (Inspeksi)');
  const [progressPesan, setProgressPesan] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Upload states for bukti pengiriman & bukti terima uang
  const [uploadingTxId, setUploadingTxId] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<'kirim' | 'pengiriman' | 'terima' | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (transaksiId: number, type: 'kirim' | 'pengiriman' | 'terima') => {
    if (!uploadFile) return;
    setUploadError(null);
    setUploadingTxId(transaksiId);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Silakan login kembali.');
      const ext = uploadFile.name.split('.').pop() || 'pdf';
      const filePath = `${user.id}/${type}_${transaksiId}_${Date.now()}.${ext}`;
      const { data: up, error: storageErr } = await supabase.storage.from('bukti-transfer').upload(filePath, uploadFile, { upsert: false });
      if (storageErr) throw new Error(storageErr.message);
      let result: { success: boolean; error?: string };
      if (type === 'kirim') result = await uploadBuktiKirimUmkm(transaksiId, up.path);
      else if (type === 'pengiriman') result = await uploadBuktiPengiriman(transaksiId, up.path);
      else result = await uploadBuktiTerimaUang(transaksiId, up.path);
      if (!result.success) throw new Error(result.error);
      setUploadFile(null);
      setUploadType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      router.refresh();
    } catch (e: any) {
      setUploadError(e.message || 'Gagal upload.');
    } finally {
      setUploadingTxId(null);
    }
  };

  const filtered = transaksi.filter(t =>
    t.trxCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.industriNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.pesan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tab 1: Industri belum bayar (semua status belum lunas)
  const menungguPembayaran = filtered.filter(t => t.status === 'belum lunas');
  // Tab 2: Industri sudah bayar, UMKM sedang proses (belum ada konfirmasi selesai)
  const dalamPengerjaan = filtered.filter(t => t.status === 'lunas' && !t.tanggalSelesai);
  // Tab 3: Industri sudah konfirmasi selesai (tanggalSelesai ter-set)
  const selesai = filtered.filter(t => t.status === 'lunas' && !!t.tanggalSelesai);

  const tabs = [
    { key: 'pembayaran' as const, label: 'Menunggu Pembayaran', count: menungguPembayaran.length },
    { key: 'pengerjaan' as const, label: 'Dalam Pengerjaan', count: dalamPengerjaan.length },
    { key: 'selesai' as const, label: 'Selesai', count: selesai.length },
  ];

  const currentList = activeTab === 'pembayaran' ? menungguPembayaran
    : activeTab === 'pengerjaan' ? dalamPengerjaan
    : selesai;

  const getStatusBadge = (t: TransaksiItem) => {
    if (t.status === 'lunas' && !!t.tanggalSelesai) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
          <CheckCircle className="w-3 h-3" />
          Selesai
        </span>
      );
    }
    if (t.status === 'lunas') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-semibold">
          <CheckCircle className="w-3 h-3" />
          Lunas
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

  const handleUpdateSubmit = async () => {
    if (!selectedTransaksi) return;
    setIsUpdating(true);
    const result = await updateTransaksiProgress(selectedTransaksi.id, newProgressStatus, progressPesan);
    setIsUpdating(false);
    
    if (result.success) {
      alert('Status progres berhasil diperbarui dan notifikasi telah dikirim ke Industri.');
      setUpdateModalOpen(false);
      setSelectedTransaksi(null);
      setProgressPesan('');
      router.refresh();
    } else {
      alert(result.error || 'Terjadi kesalahan.');
    }
  };

  return (
    <div className="w-full bg-bg-color min-h-screen">
      <div className="p-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 bg-transparent">
          <div>
            <div className="text-[14px] font-medium text-text-muted mb-1">Halaman / Transaksi</div>
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
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold cursor-pointer border-2 border-white shadow-sm">
              {umkmName.substring(0, 2).toUpperCase()}
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
                  ? 'bg-primary text-white shadow-sm'
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
                className={`bg-card-bg rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-transparent hover:border-indigo-100 ${
                  t.status === 'lunas' ? 'opacity-80' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="font-bold text-primary text-[15px]">{t.trxCode}</div>
                    {getStatusBadge(t)}
                    {t.progressStatus && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                        <ArrowRightLeft className="w-3 h-3" />
                        {t.progressStatus}
                      </span>
                    )}
                    <span className="text-[13px] text-text-muted">{formatDate(t.tanggalMulai)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="text-[14px] font-bold text-text-main mb-1 line-clamp-1 max-w-[500px]">
                      {t.pesan}
                    </div>
                    <div className="text-[13px] text-text-muted mb-3">
                      Mitra: {t.industriNama}
                    </div>

                    {/* ── Escrow Status Section ── */}
                    <div className="space-y-2 mt-2">
                      {/* Upload bukti kirim: hanya setelah Industri bayar (status lunas) */}
                      {t.status === 'lunas' && !t.buktiKirimUmkm && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                            <UploadCloud className="w-3.5 h-3.5" /> Upload Bukti Pengiriman / Selesai Pengerjaan
                          </p>
                          <p className="text-xs text-blue-600 mb-2">Upload bukti agar mitra industri dapat mengkonfirmasi penerimaan dan melanjutkan pembayaran.</p>
                          {uploadError && uploadingTxId === t.id && uploadType === 'kirim' && (
                            <p className="text-xs text-red-600 mb-1">{uploadError}</p>
                          )}
                          <label className="flex items-center gap-2 p-2 bg-white border border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors text-xs text-blue-500">
                            <FileText className="w-4 h-4 shrink-0" />
                            {uploadFile && uploadingTxId === t.id && uploadType === 'kirim'
                              ? uploadFile.name
                              : 'Klik pilih file bukti (PDF/JPG, maks 5MB)'}
                            <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f || f.size > 5 * 1024 * 1024) { setUploadError('Maks 5MB.'); return; }
                                setUploadFile(f); setUploadType('kirim'); setUploadingTxId(t.id); setUploadError(null);
                              }} />
                          </label>
                          <button
                            disabled={!uploadFile || uploadingTxId !== t.id || uploadType !== 'kirim'}
                            onClick={() => handleUpload(t.id, 'kirim')}
                            className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            {uploadingTxId === t.id && uploadType === 'kirim' ? 'Mengunggah...' : 'Kirim Bukti'}
                          </button>
                        </div>
                      )}

                      {/* Bukti kirim sudah diupload, menunggu konfirmasi selesai dari industri */}
                      {t.buktiKirimUmkm && !t.tanggalSelesai && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          <p className="text-xs font-semibold text-amber-700">Bukti pengerjaan terkirim. Menunggu mitra industri mengkonfirmasi pesanan selesai.</p>
                        </div>
                      )}

                      {/* Petunjuk: menunggu pembayaran dari industri */}
                      {activeTab === 'pembayaran' && (
                        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-600 mb-0.5">Langkah berikutnya</p>
                            <p className="text-xs text-slate-500">
                              Menunggu mitra industri melakukan pembayaran. Setelah pembayaran dikonfirmasi Admin, Anda dapat mengupload bukti pengerjaan/pengiriman.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Bukti pengiriman lama (escrow admin) — hanya muncul setelah buktiKirimUmkm ada dan konfirmasi selesai */}
                      {t.buktiKirimUmkm && !!t.tanggalSelesai && t.statusPengiriman === 'dikirim' && !t.buktiPembayaranUmkm && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          <p className="text-xs font-semibold text-amber-700">Bukti pengiriman terkirim. Menunggu Admin transfer dana ke rekening Anda.</p>
                        </div>
                      )}

                      {/* Step 3: Admin sudah bayar ke UMKM, upload bukti terima */}
                      {t.buktiPembayaranUmkm && !t.buktiTerimaUang && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                            <Banknote className="w-3.5 h-3.5" /> Admin sudah transfer! Upload Bukti Terima Dana
                          </p>
                          {uploadError && uploadingTxId === t.id && uploadType === 'terima' && (
                            <p className="text-xs text-red-600 mb-1">{uploadError}</p>
                          )}
                          <label className="flex items-center gap-2 p-2 bg-white border border-dashed border-emerald-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors text-xs text-emerald-600">
                            <FileText className="w-4 h-4 shrink-0" />
                            {uploadFile && uploadingTxId === t.id && uploadType === 'terima'
                              ? uploadFile.name
                              : 'Klik pilih bukti penerimaan dana (PDF/JPG, maks 5MB)'}
                            <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f || f.size > 5 * 1024 * 1024) { setUploadError('Maks 5MB.'); return; }
                                setUploadFile(f); setUploadType('terima'); setUploadingTxId(t.id); setUploadError(null);
                              }} />
                          </label>
                          <button
                            disabled={!uploadFile || uploadingTxId !== t.id || uploadType !== 'terima'}
                            onClick={() => handleUpload(t.id, 'terima')}
                            className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            {uploadingTxId === t.id && uploadType === 'terima' ? 'Mengunggah...' : 'Konfirmasi Terima Dana'}
                          </button>
                        </div>
                      )}

                      {/* Step 4: Pencairan selesai */}
                      {t.statusPencairan === 'selesai' && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                          <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          <p className="text-xs font-bold text-emerald-700">Dana telah diterima. Transaksi escrow selesai.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeTab === 'pengerjaan' && (
                      <button
                        onClick={() => {
                          setSelectedTransaksi(t);
                          setNewProgressStatus(t.progressStatus || 'Mesin Sedang Disiapkan (Inspeksi)');
                          setProgressPesan('');
                          setUpdateModalOpen(true);
                        }}
                        className="px-4 py-2 border border-primary text-primary hover:bg-primary/10 rounded-lg text-[13px] font-semibold transition-colors"
                      >
                        Update Progres
                      </button>
                    )}
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
                Transaksi akan muncul di sini setelah Anda menerima request kerja sama.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Update Progress Modal */}
      {updateModalOpen && selectedTransaksi && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border-color">
              <h3 className="font-bold text-[18px]">Update Status Kerja Sama</h3>
              <button onClick={() => setUpdateModalOpen(false)} className="text-text-muted hover:text-text-main">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <label className="block text-[14px] font-semibold text-text-main mb-2">Status Progres</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-lg border border-border-color bg-bg-color text-[14px] focus:outline-none focus:border-primary"
                  value={newProgressStatus}
                  onChange={(e) => setNewProgressStatus(e.target.value)}
                >
                  <option value="Mesin Sedang Disiapkan (Inspeksi)">Mesin Sedang Disiapkan (Inspeksi)</option>
                  <option value="Sedang Diproses">Sedang Diproses</option>
                  <option value="Pengerjaan Selesai">Pengerjaan Selesai</option>
                  <option value="Barang Dikirim">Barang Dikirim</option>
                  <option value="Menunggu Konfirmasi Industri">Menunggu Konfirmasi Industri</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-[14px] font-semibold text-text-main mb-2">Pesan Tambahan (Opsional)</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-color bg-bg-color text-[14px] focus:outline-none focus:border-primary"
                  placeholder="Contoh: Produksi telah mencapai 50%..."
                  value={progressPesan}
                  onChange={(e) => setProgressPesan(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="p-5 border-t border-border-color flex justify-end gap-3">
              <button 
                onClick={() => setUpdateModalOpen(false)}
                className="px-4 py-2 rounded-lg font-semibold text-[14px] border border-border-color hover:bg-bg-color"
                disabled={isUpdating}
              >
                Batal
              </button>
              <button 
                onClick={handleUpdateSubmit}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg font-semibold text-[14px] bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {isUpdating ? 'Mengirim...' : 'Kirim Update ke Industri'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {selectedTransaksi.history.map((h) => (
                    <div key={h.id} className="relative pl-6 border-l-2 border-border-color pb-4 last:border-0 last:pb-0">
                      <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1"></div>
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
                  Belum ada update histori progres.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
