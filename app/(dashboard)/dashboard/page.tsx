export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard Utama</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Produk</h3>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Koneksi Aktif</h3>
          <p className="text-2xl font-bold">5</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pesan Baru</h3>
          <p className="text-2xl font-bold">2</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Aktivitas Terkini</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">PT. Industri Maju</p>
              <p className="text-sm text-gray-500">Mengajukan kerjasama baru</p>
            </div>
            <span className="text-xs text-gray-400">2 jam yang lalu</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">Batik Sejahtera</p>
              <p className="text-sm text-gray-500">Memperbarui katalog produk</p>
            </div>
            <span className="text-xs text-gray-400">5 jam yang lalu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
