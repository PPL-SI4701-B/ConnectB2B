import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { 
  Store, 
  Factory, 
  Handshake, 
  Search, 
  Bell, 
  Settings,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let umkmId = null;
  if (user) {
    const { data: umkmData } = await supabase
      .from('umkm')
      .select('id')
      .eq('user_id', user.id)
      .single() as any;
    umkmId = umkmData?.id;
  }

  // Fetch metrics
  const { count: countUmkm } = await supabase
    .from('umkm')
    .select('*', { count: 'exact', head: true });
    
  const { count: countIndustri } = await supabase
    .from('industri')
    .select('*', { count: 'exact', head: true });
    
  let activeCooperations = 0;
  let requests: any[] = [];

  if (umkmId) {
    // Active cooperations
    const { count } = await supabase
      .from('request')
      .select('*', { count: 'exact', head: true })
      .eq('umkm_id', umkmId)
      .eq('status', 'approve');

    activeCooperations = count ?? 0;

    // Recent requests
    const { data: recentReqRaw } = await supabase
      .from('request')
      .select('id, tanggal_request, status, industri_id, pesan')
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
        initials: (industriMap[req.industri_id as number] || 'UN').substring(0, 2).toUpperCase()
      }));
    }
  }


  const getStatusBadge = (status: string | null | undefined) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full text-sm font-medium">Menunggu Konfirmasi</span>;
      case 'approve':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium">Disetujui</span>;
      case 'ditolak':
        return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium">Ditolak</span>;
      default:
        return <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm font-medium">{status || 'Diproses'}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">Halaman / Dashboard</div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Utama</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari sesuatu..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm w-64"
            />
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <Settings className="w-5 h-5" />
          </button>
          <img src="https://ui-avatars.com/api/?name=Admin+User&background=4318ff&color=fff" alt="Profile" className="w-10 h-10 rounded-full ml-2 cursor-pointer object-cover shadow-sm ring-2 ring-gray-100" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Store className="w-6 h-6" />
          </div>
          <h4 className="text-gray-500 font-medium text-sm mb-1">Total UMKM Terdaftar</h4>
          <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{countUmkm ?? 0}</h2>
            <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">
              <TrendingUp className="w-3 h-3 mr-1" />
              12%
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <Factory className="w-6 h-6" />
          </div>
          <h4 className="text-gray-500 font-medium text-sm mb-1">Total Industri Terdaftar</h4>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{countIndustri ?? 0}</h2>
            <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">
              <TrendingUp className="w-3 h-3 mr-1" />
              5%
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Handshake className="w-6 h-6" />
          </div>
          <h4 className="text-gray-500 font-medium text-sm mb-1">Kerjasama Aktif</h4>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{activeCooperations ?? 0}</h2>
            <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">
              <TrendingUp className="w-3 h-3 mr-1" />
              24%
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8 text-black">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-gray-900">Aktivitas Request Kerja Sama Terbaru</h2>
          <Link href="/dashboard/transaksi" className="text-indigo-600 font-medium text-sm flex items-center hover:text-indigo-700">
            Lihat Semua <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="border-b border-gray-100 text-gray-400 text-sm font-medium">
                 <th className="p-4 pl-6 font-medium pb-3 pt-3">ID Request</th>
                 <th className="p-4 font-medium pb-3 pt-3">Industri Pencari</th>
                 <th className="p-4 font-medium pb-3 pt-3">Pesan / Info</th>
                 <th className="p-4 font-medium pb-3 pt-3">Tanggal</th>
                 <th className="p-4 pr-6 font-medium pb-3 pt-3">Status</th>
               </tr>
             </thead>
             <tbody className="text-sm font-medium divide-y divide-gray-50">
               {requests.length > 0 ? (
                 requests.map((req) => (
                   <tr key={req.id} className="hover:bg-gray-50 cursor-pointer group transition-colors">
                     <td className="p-4 pl-6 text-gray-600">#REQ-{req.id.toString().padStart(4, '0')}</td>
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-gray-100 flex justify-center items-center font-bold text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                           {req.initials}
                         </div>
                         <span className="font-semibold text-gray-900">{req.industri_nama}</span>
                       </div>
                     </td>
                     <td className="p-4 text-gray-600 max-w-[200px] truncate">{req.pesan || '-'}</td>
                     <td className="p-4 text-gray-500">
                       {new Date(req.tanggal_request).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                     </td>
                     <td className="p-4 pr-6">
                       {getStatusBadge(req.status)}
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={5} className="p-8 text-center text-gray-500">
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
