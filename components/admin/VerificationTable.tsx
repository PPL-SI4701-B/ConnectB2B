'use client';

import { useState } from 'react';
import { verifyDocument, rejectDocument } from '@/app/actions/admin-actions';
import { CheckCircle, XCircle, FileText, Check, X } from 'lucide-react';

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

export default function VerificationTable({ documents }: { documents: any[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PendingDocument | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleVerify = async (docId: number, userId: string) => {
    setLoadingId(docId);
    try {
      await verifyDocument(docId, userId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  const openRejectModal = (doc: PendingDocument) => {
    setSelectedDoc(doc);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectReason.trim()) return;
    setLoadingId(selectedDoc.id);
    try {
      await rejectDocument(selectedDoc.id, selectedDoc.user_id, rejectReason);
      setRejectModalOpen(false);
      setSelectedDoc(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  const getPublicUrl = (path: string) => {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dokumen/${path}`;
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
          <CheckCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-1">Semua Selesai!</h3>
        <p className="text-slate-500">Tidak ada dokumen yang menunggu verifikasi saat ini.</p>
      </div>
    );
  }

  return (
    <>
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
              {documents.map((doc: PendingDocument) => {
                const user = doc.users;
                if (!user) return null;

                const isUMKM = user.role === 'umkm';
                const hasUmkmName = user.umkm && user.umkm.length > 0;
                const hasIndustriName = user.industri && user.industri.length > 0;
                
                const entityName = isUMKM 
                  ? (hasUmkmName ? user.umkm[0].nama_usaha : user.nama)
                  : (hasIndustriName ? user.industri[0].nama_perusahaan : user.nama);

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{entityName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{user.nama}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        isUMKM 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {isUMKM ? 'UMKM' : 'Industri'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={getPublicUrl(doc.file_url)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{doc.jenis_dokumen}</span>
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleVerify(doc.id, doc.user_id)}
                          disabled={loadingId === doc.id}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingId === doc.id ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1.5" />
                              Setuju
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openRejectModal(doc)}
                          disabled={loadingId === doc.id}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          <X className="w-4 h-4 mr-1.5" />
                          Tolak Izin
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

      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRejectModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Alasan Penolakan</h3>
              <button 
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catatan untuk <span className="font-semibold text-slate-900">{selectedDoc?.users?.nama}</span>
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none shadow-sm placeholder-slate-400"
                  placeholder="Beri tahu pengguna mengapa dokumen ini ditolak. Misalnya: Foto buram atau dokumen tidak relevan."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || loadingId === selectedDoc?.id}
                  className="px-4 py-2 text-sm font-medium text-white shadow-sm shadow-red-500/20 bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center min-w-[5rem]"
                >
                   {loadingId === selectedDoc?.id ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : 'Kirim Penolakan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
