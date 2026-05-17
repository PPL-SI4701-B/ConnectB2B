import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { 
  Store, 
  Factory, 
  Handshake, 
  Search, 
  Bell, 
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let umkmId = null;
  let umkmName = 'User';
  if (user) {
    const { data: umkmData } = await supabase
      .from('umkm')
      .select('id, nama_usaha')
      .eq('user_id', user.id)
      .single() as any;
    umkmId = umkmData?.id;
    umkmName = umkmData?.nama_usaha || umkmName;
  }

  // Get global metrics
  const { count: countUMKM } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'umkm')
    .eq('status_verifikasi', 'terverifikasi');
    
  const { count: countIndustri } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'industri')
    .eq('status_verifikasi', 'terverifikasi');

  let activeCooperations = 0;
  let requests: any[] = [];

  if (umkmId) {
    // Active cooperations for this UMKM
    const { count: ca } = await supabase
      .from('request')
      .select('*', { count: 'exact', head: true })
      .eq('umkm_id', umkmId)
      .eq('status', 'approve');
    activeCooperations = ca ?? 0;

    // Recent requests
    const { data: recentReqRaw } = await supabase
      .from('request')
      .select('id, tanggal_request, status, industri_id, pesan, umkm_id')
      .eq('umkm_id', umkmId)
      .order('tanggal_request', { ascending: false })
      .limit(5);
    const recentReq = recentReqRaw as any[] | null;

    if (recentReq && recentReq.length > 0) {
      // Fetch industri details for these requests
      const industriIds = Array.from(new Set(recentReq.map(r => r.industri_id))).filter(Boolean) as number[];

      const industriMap: Record<number, string> = {};
      if (industriIds.length > 0) {
        const { data: industrisRaw } = await supabase
          .from('industri')
          .select('id, nama_perusahaan')
          .in('id', industriIds);
        const industris = industrisRaw as any[] | null;
          
        industris?.forEach((ind: any) => {
          industriMap[ind.id] = ind.nama_perusahaan;
        });
      }

      requests = recentReq.map(req => ({
        ...req,
        industri_nama: industriMap[req.industri_id as number] || 'Unknown',
        umkm_nama: umkmName,
        initials: (industriMap[req.industri_id as number] || 'UN').substring(0, 2).toUpperCase()
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
          <div className="text-[14px] font-medium text-text-muted mb-1">Halaman / Dashboard</div>
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
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold cursor-pointer border-2 border-white shadow-sm">
            {umkmName.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[25px] mb-[30px]">
        {/* Card 1: Total UMKM */}
        <div className="bg-card-bg p-[25px] rounded-xl shadow-sm flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
          <div className="w-[60px] h-[60px] rounded-full bg-bg-color text-primary flex items-center justify-center shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-text-muted font-medium text-[14px] mb-1">Total UMKM Terdaftar</h4>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[24px] font-bold text-text-main leading-none flex items-center">{countUMKM?.toLocaleString() || 0}</h2>
              <span className="flex items-center text-success bg-[#e6f9f4] px-2 py-1 rounded-lg text-[12px] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> 12%
              </span>
            </div>
          </div>
        </div>
        
        {/* Card 2: Total Industri */}
        <div className="bg-card-bg p-[25px] rounded-xl shadow-sm flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
          <div className="w-[60px] h-[60px] rounded-full bg-[#fffbdf] text-warning flex items-center justify-center shrink-0">
            <Factory className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-text-muted font-medium text-[14px] mb-1">Total Industri Terdaftar</h4>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[24px] font-bold text-text-main leading-none flex items-center">{countIndustri?.toLocaleString() || 0}</h2>
              <span className="flex items-center text-success bg-[#e6f9f4] px-2 py-1 rounded-lg text-[12px] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> 5%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Kerjasama Aktif */}
        <div className="bg-card-bg p-[25px] rounded-xl shadow-sm flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
          <div className="w-[60px] h-[60px] rounded-full bg-[#e6f9f4] text-success flex items-center justify-center shrink-0">
            <Handshake className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-text-muted font-medium text-[14px] mb-1">Kerjasama Aktif</h4>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[24px] font-bold text-text-main leading-none flex items-center">{activeCooperations}</h2>
              <span className="flex items-center text-success bg-[#e6f9f4] px-2 py-1 rounded-lg text-[12px] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> 24%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card-bg rounded-xl shadow-sm overflow-hidden p-[30px] min-h-[400px]">
        <div className="flex justify-between items-center mb-[25px]">
          <h2 className="text-[20px] font-bold text-text-main">Aktivitas Request Kerja Sama Terbaru</h2>
          <Link href="/dashboard/transaksi" className="text-text-main bg-transparent border border-border-color px-5 py-2.5 rounded-lg font-semibold text-[15px] flex items-center hover:bg-bg-color transition-colors">
            Lihat Semua <ChevronRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
               <tr>
                 <th className="text-text-muted font-semibold text-[14px] pb-[15px] border-b border-border-color">ID Request</th>
                 <th className="text-text-muted font-semibold text-[14px] pb-[15px] border-b border-border-color">Industri Pencari</th>
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
                         <span className="font-semibold text-[15px] text-text-main">{req.industri_nama}</span>
                       </div>
                     </td>
                     <td className="py-[18px] border-b border-border-color text-[15px] font-semibold text-text-main group-last:border-none">{req.umkm_nama}</td>
                     <td className="py-[18px] border-b border-border-color text-[15px] font-semibold text-text-main group-last:border-none truncate max-w-[150px]">{req.pesan || '-'}</td>
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
                   <td colSpan={6} className="py-[18px] text-center text-text-muted text-[15px] font-medium border-b border-border-color">
                     Belum ada aktivitas request kerja sama terbaru.
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
