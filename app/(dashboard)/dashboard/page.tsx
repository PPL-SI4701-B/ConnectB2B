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
    <div className="max-w-7xl mx-auto space-y-8 bg-[#FAFBFF] min-h-screen pb-10">
      {/* Header matching mockup */}
      <header className="flex justify-between items-center pt-2">
        <div>
          <div className="text-xs font-medium text-slate-400 mb-1">Halaman / Dashboard</div>
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
          <NotificationBell />
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md cursor-pointer ml-2 text-sm">
            {umkmName.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total UMKM */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-medium text-xs mb-1">Total UMKM Terdaftar</h4>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-bold text-slate-800 leading-none">{countUMKM?.toLocaleString() || 0}</h2>
              <span className="flex items-center text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold mb-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
              </span>
            </div>
          </div>
        </div>
        
        {/* Card 2: Total Industri */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-medium text-xs mb-1">Total Industri Terdaftar</h4>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-bold text-slate-800 leading-none">{countIndustri?.toLocaleString() || 0}</h2>
              <span className="flex items-center text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold mb-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +5%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Kerjasama Aktif */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
            <Handshake className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-400 font-medium text-xs mb-1">Kerjasama Aktif</h4>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl font-bold text-slate-800 leading-none">{activeCooperations}</h2>
              <span className="flex items-center text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold mb-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +24%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-8 text-slate-800">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Aktivitas Request Kerja Sama Terbaru</h2>
          <Link href="/dashboard/transaksi" className="text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-full font-medium text-xs flex items-center hover:bg-slate-50 transition-colors shadow-sm">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left border-collapse min-w-[900px]">
             <thead>
               <tr className="border-b border-slate-100 text-slate-400 text-xs font-medium">
                 <th className="p-4 pl-6 font-medium pb-4">ID Request</th>
                 <th className="p-4 font-medium pb-4">Industri Pencari</th>
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
                         <span className="font-semibold text-slate-700 text-xs">{req.industri_nama}</span>
                       </div>
                     </td>
                     <td className="p-4 text-slate-600 text-xs font-semibold">{req.umkm_nama}</td>
                     <td className="p-4 text-slate-600 text-xs truncate max-w-[150px]">{req.pesan || '-'}</td>
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
                   <td colSpan={6} className="p-10 text-center text-slate-400 text-sm">
                     Belum ada aktivitas request kerja sama terbaru.
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
