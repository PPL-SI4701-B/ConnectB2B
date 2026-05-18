'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Inbox, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { acceptRequest, rejectRequest } from '@/app/actions/request-actions';
import { toast } from 'react-hot-toast';
import NotificationBell from '@/components/layout/NotificationBell';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface RequestItem {
  id: number;
  pesan: string | null;
  status: string;
  tanggal_request: string;
  industri_nama: string;
  industri_lokasi: string | null;
  initials: string;
}

export default function RequestMasukClient({
  requests: initialRequests,
  umkmName,
}: {
  requests: RequestItem[];
  umkmName: string;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const filteredRequests = requests.filter(req =>
    req.industri_nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.pesan || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending');

  const handleAccept = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      await acceptRequest(requestId);
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: 'approve' } : r)
      );
      toast.success('Request diterima! Transaksi telah dibuat.');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menerima request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      await rejectRequest(requestId);
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: 'ditolak' } : r)
      );
      toast.success('Request ditolak. Notifikasi dikirim ke pengirim.');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menolak request');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Menunggu Respon
          </span>
        );
      case 'approve':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Request Diterima
          </span>
        );
      case 'ditolak':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold">
            <XCircle className="w-3 h-3" />
            Request Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: localeId });
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
            <div className="text-[14px] font-medium text-text-muted mb-1">Halaman / Request Masuk</div>
            <h1 className="text-[32px] font-bold text-text-main">Request Kerja Sama Masuk</h1>
            <p className="text-text-muted text-[15px] mt-1">Tinjau dan respon permintaan kolaborasi dari Industri atau UMKM lain.</p>
          </div>

          <div className="flex items-center gap-5 bg-card-bg px-5 py-2.5 rounded-[30px] shadow-sm">
            <div className="flex items-center bg-bg-color px-5 py-2.5 rounded-[20px] gap-2.5">
              <Search className="w-5 h-5 text-text-muted" />
              <input
                type="text"
                placeholder="Cari nama pemohon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-text-main font-medium w-[180px] text-[15px] placeholder:text-text-muted"
              />
            </div>
            <NotificationBell />
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold cursor-pointer border-2 border-white shadow-sm">
              {umkmName.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Pending Requests */}
        <div className="space-y-5">
          {pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-card-bg rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-transparent hover:border-indigo-100"
              >
                {/* Card Header */}
                <div className="flex justify-between items-center mb-5 pb-5 border-b border-border-color">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {req.initials}
                    </div>
                    <div>
                      <div className="font-bold text-[16px] text-text-main">{req.industri_nama}</div>
                      <div className="text-[13px] text-text-muted">
                        Meminta: <span className="font-medium text-text-main">Kerja Sama Kolaborasi</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(req.status)}
                    <div className="text-[12px] text-text-muted mt-1.5">
                      Masuk: {formatTimeAgo(req.tanggal_request)}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="mb-5">
                  <div className="text-[13px] font-semibold text-text-muted mb-2">Detail Permintaan:</div>
                  <div className="bg-bg-color p-4 rounded-lg text-[14px] leading-relaxed text-text-main">
                    {req.pesan || 'Tidak ada pesan tambahan.'}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-dashed border-border-color">
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    className="px-6 py-2.5 border border-rose-300 text-rose-500 rounded-lg font-semibold text-[14px] hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    Tolak Request
                  </button>
                  <button
                    onClick={() => handleAccept(req.id)}
                    disabled={processingId === req.id}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold text-[14px] hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {processingId === req.id ? 'Memproses...' : 'Terima & Buat Transaksi'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            /* Empty State */
            <div className="bg-card-bg rounded-xl shadow-sm p-16 text-center">
              <div className="w-20 h-20 bg-bg-color rounded-full flex items-center justify-center mx-auto mb-5">
                <Inbox className="w-10 h-10 text-border-color" />
              </div>
              <div className="font-bold text-[18px] text-text-muted mb-2">
                {searchQuery ? 'Tidak ditemukan' : 'Belum ada request masuk'}
              </div>
              <p className="text-text-muted text-[14px]">
                {searchQuery
                  ? 'Coba ubah kata kunci pencarian Anda.'
                  : 'Request kerja sama dari Industri atau UMKM lain akan muncul di sini.'}
              </p>
            </div>
          )}
        </div>

        {/* Processed Requests (History) */}
        {processedRequests.length > 0 && (
          <div className="mt-10">
            <h2 className="text-[20px] font-bold text-text-main mb-5">Riwayat Request</h2>
            <div className="space-y-4">
              {processedRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-card-bg rounded-xl shadow-sm p-5 opacity-75"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shrink-0">
                        {req.initials}
                      </div>
                      <div>
                        <div className="font-bold text-[15px] text-text-main">{req.industri_nama}</div>
                        <div className="text-[13px] text-text-muted truncate max-w-[400px]">
                          {req.pesan || 'Tidak ada pesan.'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(req.status)}
                      <span className="text-[12px] text-text-muted">{formatTimeAgo(req.tanggal_request)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
