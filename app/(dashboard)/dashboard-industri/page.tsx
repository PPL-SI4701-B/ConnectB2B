import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { 
  Store, 
  Factory, 
  Handshake, 
  Search, 
  Bell, 
  Clock,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

export default async function DashboardIndustriPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let industriId = null;
  let industriName = 'Perusahaan';
  
  if (user) {
    const { data: industriDataRaw } = await supabase
      .from('industri')
      .select('id, nama_perusahaan')
      .eq('user_id', user.id)
      .single() as any;
    const indData = industriDataRaw as any;
    industriId = indData?.id;
    industriName = indData?.nama_perusahaan || industriName;
  }

  let totalMitra = 0;
  let pendingRequests = 0;
  let activeProcess = 0;
  let requests: any[] = [];

  if (industriId) {
    // Total Mitra UMKM (distinct umkm_id from approved requests)
    const { data: reqs } = await supabase
      .from('request')
      .select('umkm_id')
      .eq('industri_id', industriId)
      .eq('status', 'approve') as any;
      
    if (reqs && reqs.length > 0) {
      const distinctUmkm = new Set((reqs as any[]).map((r: any) => r.umkm_id));
      totalMitra = distinctUmkm.size;
    }

    // Pending requests
    const { count: countPending } = await supabase
      .from('request')
      .select('*', { count: 'exact', head: true })
      .eq('industri_id', industriId)
      .eq('status', 'pending');
    pendingRequests = countPending ?? 0;

    // Active Process
    const { count: countActive } = await supabase
      .from('request')
      .select('*', { count: 'exact', head: true })
      .eq('industri_id', industriId)
      .eq('status', 'approve');
    activeProcess = countActive ?? 0;

    // Recent requests
    const { data: recentReqRaw } = await supabase
      .from('request')
      .select('id, tanggal_request, status, umkm_id, pesan')
      .eq('industri_id', industriId)
      .order('tanggal_request', { ascending: false })
      .limit(5);
    const recentReq = recentReqRaw as any[] | null;

    if (recentReq && recentReq.length > 0) {
      // Fetch UMKM details
      const umkmIds = Array.from(new Set(recentReq.map(r => r.umkm_id))).filter(Boolean) as number[];

      const umkmMap: Record<number, string> = {};
      if (umkmIds.length > 0) {
        const { data: umkmsRaw } = await supabase
          .from('umkm')
          .select('id, nama_usaha')
          .in('id', umkmIds);
        const umkms = umkmsRaw as any[] | null;
          
        umkms?.forEach((u: any) => {
          umkmMap[u.id] = u.nama_usaha;
        });
      }

      requests = recentReq.map(req => ({
        ...req,
        umkm_nama: umkmMap[req.umkm_id] || 'Unknown UMKM',
        initials: (umkmMap[req.umkm_id] || 'UN').substring(0, 2).toUpperCase()
      }));
    }
  }


  const getStatusBadge = (status: string | null | undefined) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">Menunggu Konfirmasi</span>;
      case 'approve':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">Kerja Sama Aktif</span>;
      case 'ditolak':
        return <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold">Ditolak</span>;
      case 'selesai':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">Selesai</span>;
      case 'negosiasi':
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold">Negosiasi</span>;
      default:
        return <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-semibold">{status || 'Diproses'}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 bg-[#FAFBFF] min-h-screen pb-10">
      {/* Header matching mockup */}
      <header className="flex justify-between items-center pt-2">
        <div>
          <div className="text-xs font-medium text-slate-400 mb-1">Halaman / Dashboard Industri</div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Utama</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari sesuatu..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm w-64 shadow-sm"
            />
          </div>
          <button className="p-2 text-slate-400 bg-white hover:bg-slate-50 border border-slate-200 rounded-full relative transition-all shadow-sm">
            <Bell className="w-4 h-4" />
            {pendingRequests > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md cursor-pointer ml-2 text-sm">
            {industriName.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Mitra UMKM */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-medium text-xs mb-1">Mitra UMKM</h4>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-bold text-slate-800 leading-none">{totalMitra}</h2>
              <span className="flex items-center text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold mb-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +2%
              </span>
            </div>
          </div>
        </div>
        
        {/* Card 2: Request Menunggu */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-medium text-xs mb-1">Request Menunggu</h4>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-bold text-slate-800 leading-none">{pendingRequests}</h2>
              <span className="flex items-center text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-bold mb-1">
                Perlu Diproses
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Kerja Sama Aktif */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
            <Handshake className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-medium text-xs mb-1">Kerja Sama Aktif</h4>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-bold text-slate-800 leading-none">{activeProcess}</h2>
              <span className="flex items-center text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold mb-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +15%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-8 text-slate-800">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Status Pemesanan</h2>
          <Link href="/dashboard-industri/transaksi" className="text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-full font-medium text-xs flex items-center hover:bg-slate-50 transition-colors shadow-sm">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left border-collapse min-w-[700px]">
             <thead>
               <tr className="border-b border-slate-100 text-slate-400 text-xs font-medium">
                 <th className="p-4 pl-6 font-medium pb-4">ID Request</th>
                 <th className="p-4 font-medium pb-4">UMKM Mitra</th>
                 <th className="p-4 font-medium pb-4">Jenis Kerja Sama</th>
                 <th className="p-4 font-medium pb-4">Tanggal</th>
                 <th className="p-4 pr-6 font-medium pb-4">Status</th>
               </tr>
             </thead>
             <tbody className="text-sm font-medium divide-y divide-slate-50">
               {requests.length > 0 ? (
                 requests.map((req) => (
                   <tr key={req.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                     <td className="p-4 pl-6 text-slate-600 text-xs">#REQ-{req.id.toString().padStart(4, '0')}</td>
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <div className="text-indigo-600 font-bold text-xs w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                           {req.initials}
                         </div>
                         <span className="font-semibold text-slate-700 text-xs">{req.umkm_nama}</span>
                       </div>
                     </td>
                     <td className="p-4 text-slate-600 text-xs truncate max-w-[200px]">{req.pesan || '-'}</td>
                     <td className="p-4 text-slate-500 text-xs font-medium">
                       {new Date(req.tanggal_request).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                     </td>
                     <td className="p-4 pr-6">
                       {getStatusBadge(req.status)}
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={5} className="p-10 text-center text-slate-400 text-sm">
                     Belum ada aktivitas status pemesanan terbaru.
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
