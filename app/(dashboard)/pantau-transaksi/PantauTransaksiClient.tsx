'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ArrowRightLeft, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Inbox, 
  History, 
  Info, 
  UploadCloud, 
  FileText, 
  CreditCard,
  X,
  FileImage,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';
import { createClient } from '@/lib/supabase';
import { uploadPaymentProof } from '@/app/actions/transaksi-actions';
import { konfirmasiSelesai } from './actions';

interface TransaksiItem {
  id: number;
  trxCode: string;
  status: string;
  statusValidasi: string;
  progressStatus: string;
  history: any[];
  tanggalMulai: string;
  tanggalSelesai: string | null;
  pesan: string;
  mitraNama: string;
  mitraUserId: string;
  totalTagihan: number;
  details: {
    id: number;
    kuantitas: number;
    hargaSatuan: number;
    subtotal: number;
    itemName: string;
  }[];
  buktiTransfer: string | null;
  pembayaranStatus: string | null;
  hasUlasan: boolean;
}

export default function PantauTransaksiClient({
  transaksi,
  industriName,
}: {
  transaksi: TransaksiItem[];
  industriName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'berjalan' | 'pembayaran' | 'selesai'>('berjalan');
  const [selectedTrxId, setSelectedTrxId] = useState<number | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // UI Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const filtered = transaksi.filter(t =>
    t.trxCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.mitraNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.pesan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  // 1. Sedang Berjalan:
  // - Belum lunas but already uploaded proof (statusValidasi === 'menunggu')
  // - OR Lunas but not yet fully finished (status === 'lunas' && tanggalSelesai === null)
  const sedangBerjalan = filtered.filter(t => 
    (t.status === 'belum lunas' && t.statusValidasi === 'menunggu') ||
    (t.status === 'lunas' && t.tanggalSelesai === null)
  );

  // 2. Menunggu Pembayaran:
  // - Belum lunas and statusValidasi is NOT waiting validation
  const menungguPembayaran = filtered.filter(t => 
    t.status === 'belum lunas' && t.statusValidasi !== 'menunggu'
  );

  // 3. Selesai:
  // - Lunas and already marked completed (tanggalSelesai !== null)
  const selesai = filtered.filter(t => 
    t.status === 'lunas' && t.tanggalSelesai !== null
  );

  const tabs = [
    { key: 'berjalan' as const, label: 'Sedang Berjalan', count: sedangBerjalan.length },
    { key: 'pembayaran' as const, label: 'Menunggu Pembayaran', count: menungguPembayaran.length },
    { key: 'selesai' as const, label: 'Selesai', count: selesai.length },
  ];

  const currentList = activeTab === 'berjalan' ? sedangBerjalan
    : activeTab === 'pembayaran' ? menungguPembayaran
    : selesai;

  // Auto-select first transaction in list when tab changes or initial load
  useEffect(() => {
    if (currentList.length > 0) {
      const isStillInList = currentList.some(t => t.id === selectedTrxId);
      if (!isStillInList) {
        setSelectedTrxId(currentList[0].id);
        setSelectedFile(null);
        setErrorText(null);
        setSuccessId(null);
      }
    } else {
      setSelectedTrxId(null);
      setSelectedFile(null);
      setErrorText(null);
      setSuccessId(null);
    }
  }, [activeTab, currentList, selectedTrxId]);

  const selectedTransaksi = transaksi.find(t => t.id === selectedTrxId) || null;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getStatusBadge = (t: TransaksiItem) => {
    if (t.tanggalSelesai !== null) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
          <CheckCircle className="w-3 h-3" />
          Selesai (Lunas)
        </span>
      );
    }
    if (t.statusValidasi === 'menunggu') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold">
          <Clock className="w-3 h-3" />
          Menunggu Validasi Admin
        </span>
      );
    }
    if (t.statusValidasi === 'tidak valid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold">
          <AlertCircle className="w-3 h-3" />
          Pembayaran Tidak Valid
        </span>
      );
    }
    if (t.status === 'lunas') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
          <Clock className="w-3 h-3" />
          Sedang Diproses Mitra
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showToast('Format file harus JPG, PNG, atau PDF.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal adalah 5MB.', 'error');
      return;
    }
    setSelectedFile(file);
  };

  // Upload Bukti Pembayaran
  const handleUploadPayment = async () => {
    if (!selectedTransaksi || !selectedFile) return;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedTransaksi.id}_payment_${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage 'bukti-bayar' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bukti-bayar')
        .upload(fileName, selectedFile, { 
          upsert: true,
          contentType: selectedFile.type
        });

      if (uploadError) {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('bukti-bayar')
        .getPublicUrl(fileName);

      const fileUrl = publicUrlData.publicUrl;

      // 3. Trigger Server Action to update database & notify admins
      const dbResult = await uploadPaymentProof(
        selectedTransaksi.id,
        fileUrl,
        industriName
      );

      if (!dbResult.success) {
        throw new Error(dbResult.error || 'Gagal menyimpan bukti transfer.');
      }

      showToast('Bukti pembayaran berhasil dikirim! Menunggu validasi Admin.', 'success');
      setSelectedFile(null);
      
      // Refresh page and redirect to 'Sedang Berjalan' tab since it's waiting admin validation
      router.refresh();
      setActiveTab('berjalan');
      
    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      showToast(error.message || 'Terjadi kesalahan saat mengunggah bukti.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Konfirmasi Pesanan Selesai (FR-16)
  const handleKonfirmasiPesananSelesai = () => {
    if (!selectedTransaksi) return;
    setErrorText(null);

    startTransition(async () => {
      const result = await konfirmasiSelesai(
        selectedTransaksi.id,
        selectedTransaksi.mitraUserId,
        industriName
      );

      if (result.success) {
        setSuccessId(selectedTransaksi.id);
        showToast('Pesanan berhasil dikonfirmasi selesai!', 'success');
        setTimeout(() => {
          router.push(`/beri-ulasan?transaksi_id=${selectedTransaksi.id}`);
        }, 1500);
      } else {
        setErrorText(result.error || 'Gagal melakukan konfirmasi pesanan.');
      }
    });
  };

  return (
    <div className="w-full text-text-main font-sans">
      
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
            <button
              onClick={() => setToast(null)}
              className="ml-3 text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-transparent">
        <div>
          <div className="text-[13px] font-medium text-text-muted mb-1">Halaman / Pantau Transaksi</div>
          <h1 className="text-[28px] font-bold text-text-main">Pembelian &amp; Kerja Sama</h1>
          <p className="text-text-muted text-[14px] mt-0.5">Kelola pembayaran escrow, pantau progres proyek, dan lakukan konfirmasi pesanan selesai.</p>
        </div>

        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-[30px] shadow-sm w-full md:w-auto border border-border-color">
          <div className="flex items-center bg-[#f4f7fe] px-4 py-2 rounded-[20px] gap-2.5 flex-1 md:flex-none">
            <Search className="w-4.5 h-4.5 text-text-muted" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-text-main font-medium w-full md:w-[180px] text-[14px] placeholder:text-text-muted"
            />
          </div>
          <NotificationBell />
          <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0">
            {industriName.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Layout Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: LIST TRANSAKSI */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Tabs */}
          <div className="flex bg-white rounded-xl p-1 shadow-sm w-full border border-border-color">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedFile(null);
                  setErrorText(null);
                  setSuccessId(null);
                }}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-[13px] transition-all text-center ${
                  activeTab === tab.key
                    ? 'bg-secondary text-white shadow-sm'
                    : 'text-text-muted hover:text-text-main hover:bg-[#f4f7fe]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* List */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {currentList.length > 0 ? (
              currentList.map(t => {
                const isSelected = selectedTrxId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTrxId(t.id);
                      setSelectedFile(null);
                      setErrorText(null);
                      setSuccessId(null);
                    }}
                    className={`bg-white rounded-xl shadow-sm p-5 border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-secondary bg-blue-50/20 ring-1 ring-secondary/30'
                        : 'border-border-color hover:border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-secondary text-[14px]">{t.trxCode}</span>
                      {getStatusBadge(t)}
                    </div>
                    <h3 className="font-bold text-[15px] text-text-main mb-1 line-clamp-1">{t.pesan}</h3>
                    <div className="flex justify-between items-center text-[12px] text-text-muted">
                      <span>Mitra: {t.mitraNama}</span>
                      <span>{formatDate(t.tanggalMulai)}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[12px] text-text-muted font-medium">Tagihan Pembayaran:</span>
                      <span className="text-[14px] font-bold text-text-main">{formatCurrency(t.totalTagihan)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-border-color">
                <div className="w-16 h-16 bg-[#f4f7fe] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-border-color" />
                </div>
                <h4 className="font-bold text-[16px] text-text-muted mb-1">Tidak ada transaksi</h4>
                <p className="text-text-muted text-[13px]">
                  Transaksi pada tab ini kosong.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL PANEL */}
        <div className="lg:col-span-7">
          {selectedTransaksi ? (
            <div className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden">
              
              {/* Detail Header */}
              <div className="p-6 border-b border-border-color flex justify-between items-start flex-col sm:flex-row gap-4 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-bold text-secondary">{selectedTransaksi.trxCode}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[12px] text-text-muted">{formatDate(selectedTransaksi.tanggalMulai)}</span>
                  </div>
                  <h2 className="font-bold text-[20px] text-text-main line-clamp-1">{selectedTransaksi.pesan}</h2>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(selectedTransaksi)}
                </div>
              </div>

              {/* Detail Content */}
              <div className="p-6 space-y-6">
                
                {/* ESCROW WARNING/INFO BOX IF AWAITING PAYMENT OR VALIDATION */}
                {activeTab === 'pembayaran' && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 flex gap-3.5">
                    <CreditCard className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-[14px] mb-1">UMKM Menyetujui, Menunggu Pembayaran Anda</h4>
                      <p className="text-[13px] text-amber-800 leading-relaxed font-medium">
                        <strong>{selectedTransaksi.mitraNama}</strong> telah menyetujui request Anda. Silakan transfer pembayaran ke Rekening Bersama (Escrow) ConnectB2B untuk memulai proses pengerjaan.
                      </p>
                    </div>
                  </div>
                )}

                {selectedTransaksi.statusValidasi === 'tidak valid' && (
                  <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-5 flex gap-3.5">
                    <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-rose-900 text-[14px] mb-1">Bukti Transfer Ditolak</h4>
                      <p className="text-[13px] text-rose-800 leading-relaxed font-medium">
                        Bukti pembayaran sebelumnya dinyatakan tidak valid oleh Admin. Mohon lakukan pengecekan kembali dan unggah resi transfer yang benar.
                      </p>
                    </div>
                  </div>
                )}

                {selectedTransaksi.statusValidasi === 'menunggu' && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-5 flex gap-3.5">
                    <Clock className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-blue-900 text-[14px] mb-1">Menunggu Validasi Admin</h4>
                      <p className="text-[13px] text-blue-800 leading-relaxed">
                        Bukti transfer telah berhasil diunggah. Tim Admin ConnectB2B sedang memproses verifikasi dana masuk sistem Escrow Anda.
                      </p>
                    </div>
                  </div>
                )}

                {/* FR-16: Active Process & Awaiting confirmation box */}
                {selectedTransaksi.status === 'lunas' && selectedTransaksi.tanggalSelesai === null && successId !== selectedTransaksi.id && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex gap-3.5">
                    <CheckCircle2 className="w-6.5 h-6.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-800 text-[14px] mb-1">
                        Konfirmasi Pesanan Selesai (FR-16)
                      </h4>
                      <p className="text-[13px] text-slate-700 leading-relaxed font-medium">
                        Mitra <strong>{selectedTransaksi.mitraNama}</strong> sedang/telah memproses kerja sama Anda. Jika pekerjaan atau pesanan telah tiba dan terinspeksi dengan baik di lokasi pabrik Anda, silakan lakukan konfirmasi selesai di bawah untuk melepaskan dana escrow.
                      </p>
                    </div>
                  </div>
                )}

                {/* Success confirm banner */}
                {successId === selectedTransaksi.id && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 flex gap-3.5">
                    <CheckCircle className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-emerald-800 mb-1">
                        Pesanan Berhasil Dikonfirmasi Selesai!
                      </h4>
                      <p className="text-sm text-emerald-700 font-medium">
                        Terima kasih atas konfirmasi Anda. Sistem sedang mengalihkan Anda ke halaman ulasan...
                      </p>
                    </div>
                  </div>
                )}

                {/* Already completed banner */}
                {selectedTransaksi.tanggalSelesai !== null && successId !== selectedTransaksi.id && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex gap-3.5 items-center">
                    <CheckCircle className="w-6.5 h-6.5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-800 text-[14px]">
                        Pesanan ini telah selesai sepenuhnya
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                        Diselesaikan pada {formatDate(selectedTransaksi.tanggalSelesai)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mitra Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f4f7fe] p-4 rounded-xl border border-border-color">
                  <div>
                    <span className="text-[12px] text-text-muted block mb-0.5">Penyedia Layanan (Mitra UMKM)</span>
                    <strong className="text-[14px] text-text-main">{selectedTransaksi.mitraNama}</strong>
                  </div>
                  <div>
                    <span className="text-[12px] text-text-muted block mb-0.5">Status Kerja Sama</span>
                    <strong className="text-[14px] text-text-main capitalize">
                      {selectedTransaksi.tanggalSelesai !== null ? 'Lunas / Selesai' : 'Sedang Berlangsung'}
                    </strong>
                  </div>
                </div>

                {/* Items list */}
                <div>
                  <h4 className="font-bold text-[14px] text-text-main mb-3">Detail Kebutuhan &amp; Biaya</h4>
                  <div className="border border-border-color rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-slate-50 border-b border-border-color text-text-muted font-semibold">
                        <tr>
                          <th className="px-4 py-3">Nama Item</th>
                          <th className="px-4 py-3 text-center">Kuantitas</th>
                          <th className="px-4 py-3 text-right">Harga</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTransaksi.details && selectedTransaksi.details.length > 0 ? (
                          selectedTransaksi.details.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3.5 font-medium text-text-main">{item.itemName}</td>
                              <td className="px-4 py-3.5 text-center">{item.kuantitas}</td>
                              <td className="px-4 py-3.5 text-right">{formatCurrency(item.hargaSatuan)}</td>
                              <td className="px-4 py-3.5 text-right font-semibold text-text-main">{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-4 py-4 text-text-muted italic" colSpan={4}>Item tidak dicantumkan.</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50/50 border-t border-border-color font-bold text-[14px]">
                        <tr>
                          <td className="px-4 py-4 text-text-main" colSpan={3}>Total Tagihan Pembayaran</td>
                          <td className="px-4 py-4 text-right text-rose-600">{formatCurrency(selectedTransaksi.totalTagihan)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* FR-28: UPLOAD SECTION FOR PENDING PAYMENT */}
                {selectedTransaksi.status === 'belum lunas' && selectedTransaksi.statusValidasi !== 'menunggu' && (
                  <div className="pt-2 border-t border-border-color space-y-4">
                    <h4 className="font-bold text-[14px] text-text-main">Upload Bukti Pembayaran (FR-28)</h4>
                    
                    <label
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed transition-all rounded-lg cursor-pointer group text-center p-4 bg-white ${
                        isDragOver 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/50'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                      />
                      <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                      <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Klik atau drag untuk unggah Bukti Transfer / Resi</p>
                      <p className="text-xs text-gray-500 mt-1">Format JPG, PNG, atau PDF maks. 5MB</p>
                    </label>

                    {/* Selected File Details */}
                    {selectedFile && (
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-border-color rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg border border-border-color text-secondary shrink-0">
                            {selectedFile.type.includes('pdf') ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                          </div>
                          <div className="text-left">
                            <p className="text-[13px] font-semibold text-text-main max-w-[280px] truncate">{selectedFile.name}</p>
                            <p className="text-[11px] text-text-muted">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="p-1 bg-white hover:bg-slate-100 rounded-full border border-border-color text-text-muted hover:text-text-main transition-all shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Action buttons */}
                    <button
                      onClick={handleUploadPayment}
                      disabled={!selectedFile || isUploading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-secondary hover:bg-secondary/95 text-white font-bold text-[14px] rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isUploading ? (
                        <>
                          <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                          <span>Mengirim Bukti Pembayaran...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4.5 h-4.5" />
                          <span>Kirim Bukti Pembayaran Sistem Escrow</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* PREVIEW OF UPLOADED PROOF IF AWAITING VALIDATION */}
                {selectedTransaksi.buktiTransfer && (
                  <div className="pt-4 border-t border-border-color space-y-3">
                    <h4 className="font-bold text-[14px] text-text-main">Bukti Pembayaran Terkirim</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#f4f7fe] rounded-xl border border-border-color gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-secondary rounded-lg border border-blue-100">
                          {selectedTransaksi.buktiTransfer.toLowerCase().includes('.pdf') ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                        </div>
                        <div>
                          <span className="text-[12px] text-text-muted block">Status Resi Escrow</span>
                          <span className="text-[13px] font-bold capitalize text-text-main">{selectedTransaksi.pembayaranStatus || 'Pending'}</span>
                        </div>
                      </div>
                      <a
                        href={selectedTransaksi.buktiTransfer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-border-color bg-white hover:bg-slate-50 text-text-muted hover:text-text-main text-[13px] font-semibold rounded-lg transition-all"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                        <span>Lihat Bukti Transfer</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* FR-16: ACTION BUTTON FOR CONFIRMING PESANAN SELESAI */}
                {selectedTransaksi.status === 'lunas' && selectedTransaksi.tanggalSelesai === null && successId !== selectedTransaksi.id && (
                  <div className="pt-4 border-t border-border-color space-y-3">
                    <h4 className="font-bold text-[14px] text-text-main">Tindakan Penyelesaian Proyek</h4>
                    
                    {errorText && (
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-rose-600 text-[13px] font-semibold">
                        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                        {errorText}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => alert("Fitur komplain akan segera hadir.")}
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-border-color rounded-xl px-4 py-3 font-bold text-text-muted hover:bg-slate-50 hover:border-slate-400 hover:text-text-main transition-all text-[13px]"
                        disabled={isPending}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Ajukan Komplain
                      </button>

                      <button
                        type="button"
                        onClick={handleKonfirmasiPesananSelesai}
                        disabled={isPending}
                        className="flex-[2] flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-3 font-bold transition-all text-[13px] shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>Memproses Konfirmasi...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Pesanan Sesuai &amp; Selesai</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* REVIEW LINK IF COMPLETED */}
                {selectedTransaksi.tanggalSelesai !== null && successId !== selectedTransaksi.id && (
                  <div className="pt-4 border-t border-border-color">
                    <a
                      href={`/beri-ulasan?transaksi_id=${selectedTransaksi.id}`}
                      className="w-full flex items-center justify-center gap-2 bg-[#4318ff] hover:bg-[#3311dd] text-white rounded-xl px-5 py-3.5 font-bold transition-all text-sm shadow-sm"
                    >
                      <span>{selectedTransaksi.hasUlasan ? "Lihat Ulasan Proyek" : "Beri Ulasan Bintang & Feedback"}</span>
                      <ChevronRight className="w-4.5 h-4.5" />
                    </a>
                  </div>
                )}

                {/* Timeline/History Section */}
                <div className="pt-4 border-t border-border-color">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-[14px] text-text-main">Histori Transaksi</h4>
                    <button
                      onClick={() => setHistoryModalOpen(true)}
                      className="text-[12px] text-secondary hover:text-secondary/80 font-bold flex items-center gap-1"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Timeline Lengkap</span>
                    </button>
                  </div>
                  {selectedTransaksi.history && selectedTransaksi.history.length > 0 ? (
                    <div className="bg-[#f4f7fe] rounded-xl border border-border-color p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1.5" />
                        <div>
                          <strong className="text-[13px] text-text-main block">{selectedTransaksi.history[0].status_progress}</strong>
                          <span className="text-[11px] text-text-muted block mb-1">{new Date(selectedTransaksi.history[0].created_at).toLocaleString('id-ID')}</span>
                          {selectedTransaksi.history[0].pesan && (
                            <p className="text-[12px] text-text-muted bg-white p-2.5 border border-border-color rounded-lg mt-1 italic">
                              "{selectedTransaksi.history[0].pesan}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-text-muted italic">Belum ada progres kerja sama tercatat.</p>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-border-color p-24 text-center">
              <Inbox className="w-16 h-16 text-border-color mx-auto mb-4" />
              <h3 className="font-bold text-[18px] text-text-muted mb-1">Pilih Transaksi</h3>
              <p className="text-text-muted text-[13px]">Pilih salah satu transaksi di panel kiri untuk melihat rincian.</p>
            </div>
          )}
        </div>

      </div>

      {/* Timeline Modal */}
      {historyModalOpen && selectedTransaksi && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-border-color bg-slate-50/50">
              <div>
                <h3 className="font-bold text-[16px] text-text-main">Timeline Progres Proyek</h3>
                <span className="text-[11px] text-text-muted">{selectedTransaksi.trxCode}</span>
              </div>
              <button 
                onClick={() => setHistoryModalOpen(false)} 
                className="text-text-muted hover:text-text-main p-1 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 max-h-[380px] overflow-y-auto space-y-4">
              {selectedTransaksi.history && selectedTransaksi.history.length > 0 ? (
                <div className="space-y-4">
                  {selectedTransaksi.history.map((h, i) => (
                    <div key={h.id} className="relative pl-6 border-l-2 border-slate-200 pb-4 last:border-0 last:pb-0">
                      <div className="absolute w-3 h-3 bg-secondary rounded-full -left-[7px] top-1 ring-4 ring-blue-50"></div>
                      <div className="font-bold text-[13px] text-text-main">{h.status_progress}</div>
                      <div className="text-[11px] text-text-muted mb-1">{new Date(h.created_at).toLocaleString('id-ID')}</div>
                      {h.pesan && (
                        <div className="bg-[#f4f7fe] border border-border-color p-3 rounded-lg text-[12px] text-text-muted mt-1.5 italic">
                          "{h.pesan}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted text-[13px]">
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
