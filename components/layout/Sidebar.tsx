import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <div className="h-full px-3 py-4 flex flex-col">
        <div className="mb-10 px-2">
          <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
            ConnectB2B
          </Link>
        </div>
        <ul className="space-y-2 font-medium flex-1">
          <li>
            <Link href="/dashboard" className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group">
              <span className="ms-3">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/products" className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group">
              <span className="ms-3">Produk & Layanan</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/partners" className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group">
              <span className="ms-3">Koneksi Bisnis</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/settings" className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group">
              <span className="ms-3">Pengaturan</span>
            </Link>
          </li>
        </ul>
        <div className="pt-4 border-t border-gray-200">
          <Link href="/login" className="flex items-center p-2 text-red-600 rounded-lg hover:bg-red-50 group">
            <span className="ms-3">Keluar</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
