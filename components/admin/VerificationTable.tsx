'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { verifyUserDocuments, rejectUserDocuments } from '@/app/actions/admin-actions';
import { createClient } from '@/lib/supabase';
import {
  CheckCircle,
  XCircle,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ExternalLink,
  Loader,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';

type PendingDocument = {
  id: number;
  user_id: string;
  file_url: string;
  status_verifikasi: string;
  jenis_dokumen: string;
  users: {
    nama: string;
    role: string;
    umkm: { nama_usaha: string }[];
    industri: { nama_perusahaan: string }[];
  } | null;
};

type UserEntity = {
  user_id: string;
  nama: string;
  role: string;
  entityName: string;
  documents: {
    id: number;
    jenis_dokumen: string;
    file_url: string;
    status_verifikasi: string;
  }[];
};

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

export default function VerificationTable({ documents }: { documents: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<UserEntity | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'Semua' | 'UMKM' | 'Industri'>('Semua');
  const [docLoadingId, setDocLoadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const router = useRouter();
  const supabase = createClient();

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  }, []);

  const toggleRow = (userId: string) => {
    setExpandedRows(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // --- SETUJU (Approve) ---
  const openConfirmModal = (entity: UserEntity) => {
    setSelectedEntity(entity);
    setConfirmModalOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedEntity) return;
    setLoadingId(selectedEntity.user_id);
    setConfirmModalOpen(false);
    try {
      const result = await verifyUserDocuments(selectedEntity.user_id);
      if (!result.success) {
        showToast(`Gagal memverifikasi: ${result.error}`, 'error');
      } else {
        showToast(result.message || 'Dokumen berhasil diverifikasi!', 'success');
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat memverifikasi.', 'error');
    } finally {
      setLoadingId(null);
      setSelectedEntity(null);
    }
  };

  // --- TOLAK (Reject) ---
  const openRejectModal = (entity: UserEntity) => {
    setSelectedEntity(entity);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedEntity || !rejectReason.trim()) return;
    setLoadingId(selectedEntity.user_id);
    try {
      const result = await rejectUserDocuments(selectedEntity.user_id, rejectReason);
      if (!result.success) {
        showToast(`Gagal menolak: ${result.error}`, 'error');
      } else {
        showToast(result.message || 'Dokumen berhasil ditolak.', 'success');
        setRejectModalOpen(false);
        setSelectedEntity(null);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menolak verifikasi.', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  // Gunakan signed URL agar dokumen bisa dibuka meski bucket private
  const handleOpenDocument = async (filePath: string, docId: number) => {
    setDocLoadingId(docId);
    try {
      const { data, error } = await supabase.storage
        .from('dokumen')
        .createSignedUrl(filePath, 3600); // Berlaku 1 jam

      if (error || !data?.signedUrl) {
        showToast('Tidak dapat membuka dokumen. Pastikan bucket "dokumen" sudah dibuat di Supabase Storage.', 'error');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error(e);
      showToast('Gagal membuka dokumen.', 'error');
    } finally {
      setDocLoadingId(null);
    }
  };

  const groupedData: Record<string, UserEntity> = {};
  if (documents) {
    documents.forEach((doc: PendingDocument) => {
      if (!groupedData[doc.user_id]) {
        const user = doc.users;
        if (!user) return;
        const isUMKM = user.role === 'umkm';
        const entityName = isUMKM
          ? (user.umkm?.length > 0 ? user.umkm[0].nama_usaha : user.nama)
          : (user.industri?.length > 0 ? user.industri[0].nama_perusahaan : user.nama);

        groupedData[doc.user_id] = {
          user_id: doc.user_id,
          nama: user.nama,
          role: user.role,
          entityName,
          documents: [],
        };
      }
      groupedData[doc.user_id].documents.push({
        id: doc.id,
        jenis_dokumen: doc.jenis_dokumen,
        file_url: doc.file_url,
        status_verifikasi: doc.status_verifikasi,
      });
    });
  }

  const entities = Object.values(groupedData);
  const filteredEntities = entities.filter(entity => {
    if (filter === 'Semua') return true;
    if (filter === 'UMKM') return entity.role === 'umkm';
    if (filter === 'Industri') return entity.role === 'industri';
    return true;
  });

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

      <div className="flex space-x-2 mb-4">
        {(['Semua', 'UMKM', 'Industri'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'
            }`}
          >
            {tab} {tab !== 'Semua' && 'Saja'}
          </button>
        ))}
      </div>

      {filteredEntities.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
            <CheckCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-1">Semua Selesai!</h3>
          <p className="text-slate-500">
            Tidak ada {filter !== 'Semua' ? filter : 'dokumen'} yang menunggu verifikasi saat ini.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative z-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Nama Entitas Pendaftar</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Tipe Akun</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Dokumen Legalitas</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntities.map((entity) => {
                  const isUMKM = entity.role === 'umkm';
                  const isExpanded = expandedRows[entity.user_id];
                  const requiredDocsCount = isUMKM ? 2 : 3;
                  const isComplete = entity.documents.length >= requiredDocsCount;
                  const isLoading = loadingId === entity.user_id;

                  return (
                    <React.Fragment key={entity.user_id}>
                      <tr className={`hover:bg-slate-50/50 transition-colors ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => toggleRow(entity.user_id)}>
                          <div className="flex items-center gap-2">
                            <button className="p-1 rounded bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <div>
                              <div className="font-medium text-slate-900">{entity.entityName}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{entity.nama}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            isUMKM
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isUMKM ? 'UMKM' : 'Industri'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center gap-1.5 font-medium w-fit px-3 py-1.5 rounded-lg border ${
                            isComplete
                              ? 'bg-slate-50 text-slate-500 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <FileText className={`w-4 h-4 ${isComplete ? 'text-indigo-500' : 'text-amber-500'}`} />
                            <span>{entity.documents.length} Dokumen</span>
                            {!isComplete && (
                              <div title="Dokumen belum lengkap" className="ml-0.5 text-amber-500">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openConfirmModal(entity)}
                              disabled={isLoading || !isComplete}
                              className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm transition-all ${
                                isComplete
                                  ? 'shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'
                                  : 'bg-emerald-300 cursor-not-allowed opacity-50'
                              }`}
                              title={!isComplete ? 'Dokumen belum lengkap' : 'Setuju Verifikasi'}
                            >
                              {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <><Check className="w-4 h-4 mr-1.5" />Setuju</>
                              )}
                            </button>
                            <button
                              onClick={() => openRejectModal(entity)}
                              disabled={isLoading}
                              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              <X className="w-4 h-4 mr-1.5" />
                              Tolak Izin
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Collapsible Document List */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <td colSpan={4} className="px-6 py-4">
                            <div className="pl-10">
                              <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                                Detail Dokumen {entity.entityName}
                              </h4>
                              <div className="flex flex-wrap gap-3">
                                {entity.documents.map((doc) => (
                                  <button
                                    key={doc.id}
                                    onClick={() => handleOpenDocument(doc.file_url, doc.id)}
                                    disabled={docLoadingId === doc.id}
                                    className="inline-flex items-center space-x-2 text-indigo-700 bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm px-4 py-2.5 rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                                  >
                                    {docLoadingId === doc.id ? (
                                      <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <FileText className="w-4 h-4" />
                                    )}
                                    <span>{doc.jenis_dokumen}</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Setuju */}
      {confirmModalOpen && selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setConfirmModalOpen(false); setSelectedEntity(null); }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Setujui Verifikasi?</h3>
              <p className="text-sm text-slate-500">
                Anda akan menyetujui <strong className="text-slate-700">{selectedEntity.documents.length} dokumen</strong> milik{' '}
                <strong className="text-slate-700">{selectedEntity.entityName}</strong>.
                <br />Akun pengguna ini akan aktif setelah disetujui.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setConfirmModalOpen(false); setSelectedEntity(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={loadingId === selectedEntity.user_id}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-sm shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loadingId === selectedEntity.user_id ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Ya, Setujui
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Penolakan */}
      {rejectModalOpen && selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setRejectModalOpen(false); setSelectedEntity(null); }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <ShieldX className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Tolak Verifikasi</h3>
              </div>
              <button
                onClick={() => { setRejectModalOpen(false); setSelectedEntity(null); }}
                className="text-slate-400 hover:text-slate-500 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50/50 border border-red-100 rounded-lg p-3 mb-2">
                <p className="text-xs text-red-600">
                  Dokumen <strong>{selectedEntity.entityName}</strong> ({selectedEntity.documents.length} dokumen) akan ditolak.
                  Pengguna akan mendapat notifikasi untuk upload ulang.
                </p>
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catatan penolakan untuk <span className="font-semibold text-slate-900">{selectedEntity.nama}</span>
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none shadow-sm placeholder-slate-400"
                  placeholder="Beri tahu pengguna mengapa dokumen ini ditolak. Misalnya: Foto buram atau dokumen tidak relevan."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setRejectModalOpen(false); setSelectedEntity(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || loadingId === selectedEntity.user_id}
                  className="px-4 py-2 text-sm font-medium text-white shadow-sm shadow-red-500/20 bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center min-w-[5rem]"
                >
                  {loadingId === selectedEntity.user_id ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Kirim Penolakan'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
