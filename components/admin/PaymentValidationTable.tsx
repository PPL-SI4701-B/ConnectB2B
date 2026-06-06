'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { verifyPayment, rejectPayment } from '@/app/actions/admin-actions';
import { createClient } from '@/lib/supabase';
import {
  CheckCircle,
  XCircle,
  X,
  Check,
  ExternalLink,
  Loader,
  ShieldCheck,
  ShieldX,
  Eye,
  FileImage
} from 'lucide-react';

type PaymentData = {
  id: number;
  transaksi_id: number;
  tanggal_bayar: string;
  bukti_transfer: string | null;
  status: string;
  transaksi: {
    id: number;
    request: {
      industri: {
        nama_perusahaan: string;
        user_id: string;
      } | null;
      umkm: {
        user_id: string;
      } | null;
    } | null;
    detail_transaksi: {
      subtotal: number;
    }[];
  } | null;
};

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

export default function PaymentValidationTable({ payments }: { payments: any[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const [docLoadingId, setDocLoadingId] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  }, []);

  const getNominal = (payment: PaymentData) => {
    if (!payment.transaksi?.detail_transaksi) return 0;
    return payment.transaksi.detail_transaksi.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- SETUJU (Approve) ---
  const openConfirmModal = (payment: PaymentData) => {
    setSelectedPayment(payment);
    setConfirmModalOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedPayment) return;
    
    setLoadingId(selectedPayment.id);
    setConfirmModalOpen(false);
    try {
      const result = await verifyPayment(
        selectedPayment.id,
        selectedPayment.transaksi_id
      );
      
      if (!result.success) {
        showToast(`Gagal memverifikasi: ${result.error}`, 'error');
      } else {
        showToast(result.message || 'Pembayaran berhasil diverifikasi!', 'success');
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat memverifikasi pembayaran.', 'error');
    } finally {
      setLoadingId(null);
      setSelectedPayment(null);
    }
  };

  // --- TOLAK (Reject) ---
  const openRejectModal = (payment: PaymentData) => {
    setSelectedPayment(payment);
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedPayment) return;

    setLoadingId(selectedPayment.id);
    setRejectModalOpen(false);
    try {
      const result = await rejectPayment(
        selectedPayment.id,
        selectedPayment.transaksi_id
      );
      
      if (!result.success) {
        showToast(`Gagal menolak: ${result.error}`, 'error');
      } else {
        showToast(result.message || 'Pembayaran berhasil ditolak.', 'success');
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menolak pembayaran.', 'error');
    } finally {
      setLoadingId(null);
      setSelectedPayment(null);
    }
  };

  // --- BUKA PREVIEW ---
  const handleOpenPreview = async (filePath: string, paymentId: number) => {
    // Apabila filePath adalah URL absolute (contoh https://...), langsung buka.
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      setPreviewUrl(filePath);
      setPreviewModalOpen(true);
      return;
    }

    setDocLoadingId(paymentId);
    try {
      const { data, error } = await supabase.storage
        .from('bukti-transfer')
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl) {
        showToast('Tidak dapat memuat bukti transfer. File mungkin telah dihapus.', 'error');
        return;
      }
      
      setPreviewUrl(data.signedUrl);
      setPreviewModalOpen(true);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat dokumen bukti.', 'error');
    } finally {
      setDocLoadingId(null);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border backdrop-blur-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
              : 'bg-red-50/95 border-red-200 text-red-800'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!payments || payments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
            <CheckCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-1">Semua Selesai!</h3>
          <p className="text-slate-500">
            Tidak ada pembayaran escrow yang menunggu validasi saat ini.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative z-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">ID Transaksi</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Pengirim Dana (Industri)</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Nominal Tagihan</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Bukti Transfer</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">Aksi Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment: PaymentData) => {
                  const isLoading = loadingId === payment.id;
                  const companyName = payment.transaksi?.request?.industri?.nama_perusahaan || 'Tidak diketahui';
                  const nominal = getNominal(payment);

                  return (
                    <tr key={payment.id} className={`hover:bg-slate-50/50 transition-colors ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">TRX-{payment.transaksi_id.toString().padStart(4, '0')}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{formatDate(payment.tanggal_bayar)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                          {companyName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatCurrency(nominal)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payment.bukti_transfer ? (
                          <button
                            onClick={() => handleOpenPreview(payment.bukti_transfer!, payment.id)}
                            disabled={docLoadingId === payment.id}
                            className="inline-flex items-center gap-1.5 font-medium w-fit px-3 py-1.5 rounded-lg border bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors disabled:opacity-50"
                          >
                            {docLoadingId === payment.id ? (
                              <Loader className="w-4 h-4 animate-spin text-indigo-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-slate-500" />
                            )}
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Belum ada file</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openConfirmModal(payment)}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium text-white shadow-sm shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? (
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <><Check className="w-3.5 h-3.5 mr-1" />Dana Masuk (Valid)</>
                            )}
                          </button>
                          <button
                            onClick={() => openRejectModal(payment)}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Tolak/Palsu
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Preview Image */}
      {previewModalOpen && previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setPreviewModalOpen(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <FileImage className="w-5 h-5 text-indigo-500" />
                Preview Bukti Transfer
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                >
                  Buka Tab Baru <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100">
               {/* Asumsi gambar, PDF tidak selalu render dengan <img> tapi ini support standar browser modern di iframe jika pdf */}
              {previewUrl.toLowerCase().includes('.pdf') || previewUrl.toLowerCase().includes('pdf') ? (
                <iframe src={previewUrl} className="w-full h-[70vh] border-0 rounded" />
              ) : (
                <img 
                  src={previewUrl} 
                  alt="Bukti Transfer" 
                  className="max-w-full max-h-[75vh] object-contain rounded shadow-sm border border-slate-200"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Validasi */}
      {confirmModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setConfirmModalOpen(false); setSelectedPayment(null); }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Validasi Pembayaran Masuk?</h3>
              <p className="text-sm text-slate-500">
                Anda akan menyetujui pembayaran <strong className="text-slate-700">TRX-{selectedPayment.transaksi_id.toString().padStart(4, '0')}</strong> senilai{' '}
                <strong className="text-slate-700">{formatCurrency(getNominal(selectedPayment))}</strong> dari{' '}
                <strong className="text-slate-700">{selectedPayment.transaksi?.request?.industri?.nama_perusahaan}</strong>.
                <br /><br />Status transaksi akan menjadi lunas dan kedua belah pihak akan dinotifikasi.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setConfirmModalOpen(false); setSelectedPayment(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={loadingId === selectedPayment.id}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-sm shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loadingId === selectedPayment.id ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Ya, Validasi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Tolak */}
      {rejectModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setRejectModalOpen(false); setSelectedPayment(null); }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <ShieldX className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tolak Bukti Pembayaran?</h3>
              <p className="text-sm text-slate-500">
                Anda akan menolak bukti pembayaran <strong className="text-slate-700">TRX-{selectedPayment.transaksi_id.toString().padStart(4, '0')}</strong> dari{' '}
                <strong className="text-slate-700">{selectedPayment.transaksi?.request?.industri?.nama_perusahaan}</strong>.
                <br /><br />Pembayaran akan ditandai gagal dan pihak Industri harus mengupload ulang bukti.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setRejectModalOpen(false); setSelectedPayment(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loadingId === selectedPayment.id}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loadingId === selectedPayment.id ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4 mr-1.5" />
                    Ya, Tolak
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
