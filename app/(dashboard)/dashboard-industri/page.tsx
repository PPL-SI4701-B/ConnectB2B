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
import NotificationBell from '@/components/layout/NotificationBell';

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
    <div className="w-full bg-bg-color min-h-screen">
      <div className="p-10">
      {/* Header matching mockup */}
      <header className="flex justify-between items-center mb-8 bg-transparent">
        <div>
          <div className="text-[14px] font-medium text-text-muted mb-1">Halaman / Dashboard Industri</div>
          <h1 className="text-[32px] font-bold text-text-main">Dashboard Utama</h1>
        </div>
        
        <div className="flex items-center gap-5 bg-card-bg px-5 py-2.5 rounded-[30px] shadow-sm">
          <div className="flex items-center bg-bg-color px-5 py-2.5 rounded-[20px] gap-2.5">
            <Search className="w-5 h-5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Cari sesuatu..." 
              className="bg-transparent border-none outline-none text-text-main font-medium w-[150px] text-[15px] placeholder:text-text-muted"
            />
          </div>
          <NotificationBell />
          <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold cursor-pointer border-2 border-white shadow-sm">
            {industriName.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[25px] mb-[30px]">
        {/* Card 1: Mitra UMKM */}
        <div className="bg-card-bg p-[25px] rounded-xl shadow-sm flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
          <div className="w-[60px] h-[60px] rounded-full bg-bg-color text-primary flex items-center justify-center shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-text-muted font-medium text-[14px] mb-1">Mitra UMKM</h4>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[24px] font-bold text-text-main leading-none flex items-center">{totalMitra}</h2>
              <span className="flex items-center text-success bg-[#e6f9f4] px-2 py-1 rounded-lg text-[12px] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> 2%
              </span>
            </div>
          </div>
        </div>
        
        {/* Card 2: Request Menunggu */}
        <div className="bg-card-bg p-[25px] rounded-xl shadow-sm flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
          <div className="w-[60px] h-[60px] rounded-full bg-[#fffbdf] text-warning flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-text-muted font-medium text-[14px] mb-1">Request Menunggu</h4>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[24px] font-bold text-text-main leading-none flex items-center">{pendingRequests}</h2>
              <span className="flex items-center text-danger bg-[#feeceb] px-2 py-1 rounded-lg text-[12px] font-semibold">
                Perlu Diproses
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Kerja Sama Aktif */}
        <div className="bg-card-bg p-[25px] rounded-xl shadow-sm flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
          <div className="w-[60px] h-[60px] rounded-full bg-[#e6f9f4] text-success flex items-center justify-center shrink-0">
            <Handshake className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-text-muted font-medium text-[14px] mb-1">Kerja Sama Aktif</h4>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[24px] font-bold text-text-main leading-none flex items-center">{activeProcess}</h2>
              <span className="flex items-center text-success bg-[#e6f9f4] px-2 py-1 rounded-lg text-[12px] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> 15%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card-bg rounded-xl shadow-sm overflow-hidden p-[30px] min-h-[400px]">
        <div className="flex justify-between items-center mb-[25px]">
          <h2 className="text-[20px] font-bold text-text-main">Status Pemesanan</h2>
          <Link href="/pantau-transaksi" className="text-text-main bg-transparent border border-border-color px-5 py-2.5 rounded-lg font-semibold text-[15px] flex items-center hover:bg-bg-color transition-colors">
            Lihat Semua <ChevronRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
               <tr>
                 <th className="text-text-muted font-semibold text-[14px] pb-[15px] border-b border-border-color">ID Request</th>
                 <th className="text-text-muted font-semibold text-[14px] pb-[15px] border-b border-border-color">UMKM Mitra</th>
                 <th className="text-text-muted font-semibold text-[14px] pb-[15px] border-b border-border-color">Jenis Kerja Sama</th>
                 <th className="text-text-muted font-semibold text-[14px] pb-[15px] border-b border-border-color">Tanggal</th>
                 <th className="text-text-muted font-semibold text-[14px] pb-[15px] border-b border-border-color">Status</th>
               </tr>
             </thead>
             <tbody>
               {requests.length > 0 ? (
                 requests.map((req) => (
                   <tr key={req.id} className="hover:bg-[#f8fafc] cursor-pointer transition-colors group">
                     <td className="py-[18px] border-b border-border-color text-[15px] font-semibold text-text-main group-last:border-none">#REQ-{req.id.toString().padStart(4, '0')}</td>
                     <td className="py-[18px] border-b border-border-color group-last:border-none">
                       <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-lg bg-bg-color text-primary font-bold flex items-center justify-center">
                           {req.initials}
                         </div>
                         <span className="font-semibold text-[15px] text-text-main">{req.umkm_nama}</span>
                       </div>
                     </td>
                     <td className="py-[18px] border-b border-border-color text-[15px] font-semibold text-text-main group-last:border-none truncate max-w-[200px]">{req.pesan || '-'}</td>
                     <td className="py-[18px] border-b border-border-color text-[15px] font-semibold text-text-main group-last:border-none">
                       {new Date(req.tanggal_request).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                     </td>
                     <td className="py-[18px] border-b border-border-color group-last:border-none">
                       {getStatusBadge(req.status)}
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={5} className="py-[18px] text-center text-text-muted text-[15px] font-medium border-b border-border-color">
                     Belum ada aktivitas status pemesanan terbaru.
                   </td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}
