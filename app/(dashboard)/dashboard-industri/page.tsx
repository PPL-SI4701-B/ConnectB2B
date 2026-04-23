import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { 
  Search, 
  Bell, 
  Clock, 
  Handshake, 
  PlusCircle, 
  HeadphonesIcon,
  ChevronRight
} from 'lucide-react';

export default async function DashboardIndustriPage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let industriId = null;
  let industriName = 'Perusahaan';
  
  if (user) {
    const { data: industriData } = await supabase
      .from('industri')
      .select('id, nama_perusahaan')
      .eq('user_id', user.id)
      .single();
    const indData = industriData as any;
    industriId = indData?.id;
    industriName = indData?.nama_perusahaan || industriName;
  }

  let totalMitra = 0;
  let pendingRequests = 0;
  let activeProcess = 0;
  let requests = [];

  if (industriId) {
    // Total Mitra UMKM Disimpan (Count distinct umkm_id from request)
    const { data: reqs } = await supabase
      .from('request')
      .select('umkm_id')
      .eq('industri_id', industriId);
      
    if (reqs) {
      const distinctUmkm = new Set(reqs.map(r => r.umkm_id));
      totalMitra = distinctUmkm.size;
    }

    // Pending requests
    const { count: countPending } = await supabase
      .from('request')
      .select('*', { count: 'exact', head: true })
      .eq('industri_id', industriId)
      .in('status', ['Menunggu Konfirmasi', 'Pending', 'Negosiasi']);
    pendingRequests = countPending || 0;

    // Active Process
    const { count: countActive } = await supabase
      .from('request')
      .select('*', { count: 'exact', head: true })
      .eq('industri_id', industriId)
      .in('status', ['Kerja Sama Aktif', 'Aktif', 'Diterima']);
    activeProcess = countActive || 0;

    // Recent requests
    const { data: recentReq } = await supabase
      .from('request')
      .select('id, tanggal_request, status, umkm_id, pesan')
      .eq('industri_id', industriId)
      .order('tanggal_request', { ascending: false })
      .limit(5);

    if (recentReq && recentReq.length > 0) {
      // Fetch UMKM details
      const umkmIds = [...new Set(recentReq.map(r => r.umkm_id))].filter(Boolean);
      
      let umkmMap = {};
      if (umkmIds.length > 0) {
        const { data: umkms } = await supabase
          .from('umkm')
          .select('id, nama_usaha')
          .in('id', umkmIds);
          
        umkms?.forEach(u => {
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

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'menunggu konfirmasi umkm':
      case 'menunggu konfirmasi':
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full text-sm font-medium">Menunggu Konfirmasi UMKM</span>;
      case 'barang dikirim':
      case 'kerja sama aktif':
      case 'aktif':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium">Barang Dikirim / Aktif</span>;
      case 'selesai (butuh ulasan)':
      case 'selesai':
        return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">Selesai (Butuh Ulasan)</span>;
      default:
        return <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm font-medium">{status || 'Diproses'}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">Halaman / Dashboard Industri</div>
          <h1 className="text-3xl font-bold text-gray-900">Dasbor Perusahaan</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari partner cepat..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm w-64"
            />
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <span className="font-bold text-gray-900 hidden sm:block">{industriName}</span>
          <img src={`https://ui-avatars.com/api/?name=${industriName}&background=06b6d4&color=fff`} alt="Profile" className="w-10 h-10 rounded-full cursor-pointer object-cover shadow-sm ring-2 ring-gray-100" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-500 flex items-center justify-center mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-gray-500 font-medium text-sm mb-1">Total Mitra UMKM Disimpan</h4>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{totalMitra || 14}</h2>
            <div className="flex items-center text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md text-xs font-bold">
              2 Baru
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-gray-500 font-medium text-sm mb-1">Request Menunggu Konfirmasi</h4>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{pendingRequests || 2}</h2>
            <div className="flex items-center text-white bg-orange-500 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
              Perlu Tindakan
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
            <Handshake className="w-6 h-6" />
          </div>
          <h4 className="text-gray-500 font-medium text-sm mb-1">Proses Kerja Sama Aktif</h4>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{activeProcess || 5}</h2>
            <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">
              Stabil
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-black h-fit">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
            <h2 className="text-xl font-bold text-gray-900">Status Pemesanan / Penyewaan Terbaru</h2>
            <Link href="/dashboard-industri/transaksi" className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Kelola Transaksi
            </Link>
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse min-w-[600px]">
               <thead>
                 <tr className="border-b border-gray-100 text-gray-400 text-sm font-medium">
                   <th className="p-4 pl-6 font-medium pb-3 pt-3">ID Req</th>
                   <th className="p-4 font-medium pb-3 pt-3">UMKM Mitra</th>
                   <th className="p-4 font-medium pb-3 pt-3">Pesan / Info</th>
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
                           <div className="w-10 h-10 rounded-xl bg-gray-100 flex justify-center items-center font-bold text-cyan-600 group-hover:bg-cyan-50 transition-colors">
                             {req.initials}
                           </div>
                           <span className="font-semibold text-gray-900">{req.umkm_nama}</span>
                         </div>
                       </td>
                       <td className="p-4 text-gray-600 max-w-[200px] truncate">{req.pesan || '-'}</td>
                       <td className="p-4 pr-6">
                         {getStatusBadge(req.status)}
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={4} className="p-8 text-center text-gray-500">
                       Belum ada aktivitas request kerja sama terbaru.
                     </td>
                   </tr>
                 )}
               </tbody>
            </table>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Jalan Pintas Cepat</h2>
          <div className="space-y-4">
            <Link href="/dashboard-industri/pencarian" className="w-full flex items-center justify-start gap-3 p-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 transition-all font-medium">
              <PlusCircle className="w-6 h-6" />
              <span className="text-lg">Temukan Supplier Baru</span>
            </Link>
            
            <button className="w-full flex items-center justify-start gap-3 p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 transition-all font-medium text-left">
              <HeadphonesIcon className="w-6 h-6 text-gray-500" />
              <span className="text-lg">Pusat Bantuan B2B</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
