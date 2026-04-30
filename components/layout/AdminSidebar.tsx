import Link from 'next/link';
import { Activity, Users, Library, LogOut } from 'lucide-react';

export default function AdminSidebar() {
  return (
    <aside className="w-72 bg-gradient-to-b from-gray-900 to-indigo-900 text-white min-h-screen border-r border-indigo-800 shadow-xl flex flex-col transition-all duration-300">
      <div className="h-full px-4 py-8 flex flex-col">
        <div className="mb-12 px-2 flex items-center justify-between">
          <Link href="/admin" className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
            ConnectB2B
            <span className="block text-xs font-medium text-indigo-300 mt-1 uppercase tracking-widest">Administrator</span>
          </Link>
        </div>
        
        <ul className="space-y-3 font-medium flex-1">
          <li>
            <Link href="/admin" className="flex items-center p-3 text-white rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/5 shadow-sm group backdrop-blur-sm">
              <Activity className="w-5 h-5 text-blue-300 group-hover:text-blue-200 transition-colors" />
              <span className="ms-4 font-semibold text-sm">Overviu Aktivitas Sistem</span>
            </Link>
          </li>
          <li>
            <Link href="#" className="flex items-center p-3 text-indigo-100 rounded-xl hover:bg-white/10 hover:text-white transition-all group border border-transparent">
              <Users className="w-5 h-5 text-indigo-400 group-hover:text-indigo-200 transition-colors" />
              <span className="ms-4 font-medium text-sm">Kelola Pengguna Sistem</span>
            </Link>
          </li>
          <li>
            <Link href="#" className="flex items-center p-3 text-indigo-100 rounded-xl hover:bg-white/10 hover:text-white transition-all group border border-transparent">
              <Library className="w-5 h-5 text-indigo-400 group-hover:text-indigo-200 transition-colors" />
              <span className="ms-4 font-medium text-sm">Tinjauan Konten Katalog</span>
            </Link>
          </li>
        </ul>
        
        <div className="pt-6 mt-6 border-t border-indigo-800/50">
          <Link href="/login" className="flex items-center p-3 text-red-300 rounded-xl hover:bg-red-500/10 hover:text-red-200 transition-all group">
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="ms-4 font-medium text-sm">Keluar</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
