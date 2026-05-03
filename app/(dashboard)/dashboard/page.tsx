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
  const supabase = await createClient();
  
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

  let countProduk = 0;
  let countPending = 0;
  let activeCooperations = 0;
  let requests: any[] = [];

  if (user) {
    const { count: cp } = await supabase
      .from('produk')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    countProduk = cp ?? 0;
  }

  if (umkmId) {
    // Pending requests
    const { count: cpe } = await supabase
      .from('request')
      .select('*', { count: 'exact', head: true })
      .eq('umkm_id', umkmId)
      .eq('status', 'pending');
    countPending = cpe ?? 0;

    // Active cooperations
    const { count: ca } = await supabase
      .from('request')
      .select('*', { count: 'exact', head: true })
      .eq('umkm_id', umkmId)
      .eq('status', 'approve');
    activeCooperations = ca ?? 0;

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
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-medium border border-amber-200 shadow-sm">Menunggu Konfirmasi</span>;
      case 'approve':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium border border-emerald-200 shadow-sm">Disetujui</span>;
      case 'ditolak':
        return <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-medium border border-rose-200 shadow-sm">Ditolak</span>;
      default:
        return <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-sm font-medium border border-slate-200 shadow-sm">{status || 'Diproses'}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
            <Store className="w-4 h-4" /> <span>Halaman Dashboard</span>
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500 tracking-tight">Dashboard UMKM</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari aktivitas..." 
              className="pl-11 pr-4 py-2.5 border border-slate-200 rounded-full bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm w-64 transition-all shadow-inner"
            />
          </div>
          <button className="p-2.5 text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full relative transition-all shadow-sm">
            <Bell className="w-5 h-5" />
            {countPending > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>
          <img src="https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff" alt="Profile" className="w-11 h-11 rounded-full ml-1 cursor-pointer object-cover shadow-md ring-2 ring-indigo-50 hover:scale-105 transition-transform" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm hover:shadow-lg border border-slate-100 group transition-all duration-300">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 shadow-inner border border-indigo-100/50">
              <Store className="w-7 h-7" />
            </div>
            <h4 className="text-slate-500 font-semibold text-sm mb-2">Total Produk Katalog</h4>
            <div className="flex items-end justify-between">
              <h2 className="text-4xl font-extrabold text-slate-800">{countProduk}</h2>
              <Link href="/dashboard/katalog" className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center gap-1">
                Kelola <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Card 2 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm hover:shadow-lg border border-slate-100 group transition-all duration-300">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-5 shadow-inner border border-amber-100/50">
              <Bell className="w-7 h-7" />
            </div>
            <h4 className="text-slate-500 font-semibold text-sm mb-2">Request Menunggu</h4>
            <div className="flex items-end justify-between">
              <h2 className="text-4xl font-extrabold text-slate-800">{countPending}</h2>
              {countPending > 0 && (
                <div className="flex items-center text-white bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm animate-pulse">
                  Perlu Aksi
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm hover:shadow-lg border border-slate-100 group transition-all duration-300">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 shadow-inner border border-emerald-100/50">
              <Handshake className="w-7 h-7" />
            </div>
            <h4 className="text-slate-500 font-semibold text-sm mb-2">Kerja Sama Aktif</h4>
            <div className="flex items-end justify-between">
              <h2 className="text-4xl font-extrabold text-slate-800">{activeCooperations}</h2>
              <div className="flex items-center text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                Stabil
              </div>
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
