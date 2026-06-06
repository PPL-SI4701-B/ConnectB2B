'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Users, Library, LogOut } from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center p-3 rounded-xl transition-all border shadow-sm group backdrop-blur-sm ${
      isActive
        ? 'bg-white/10 text-white border-white/5 font-semibold'
        : 'text-indigo-100 border-transparent font-medium hover:bg-white/10 hover:text-white'
    }`;
  };

  const getIconClass = (path: string) => {
    const isActive = pathname === path;
    return `w-5 h-5 transition-colors ${
      isActive ? 'text-blue-300 group-hover:text-blue-200' : 'text-indigo-400 group-hover:text-indigo-200'
    }`;
  };

  return (
    <aside className="w-72 bg-gradient-to-b from-gray-900 to-indigo-900 text-white min-h-screen border-r border-indigo-800 shadow-xl flex flex-col transition-all duration-300">
      <div className="h-full px-4 py-8 flex flex-col">
        <div className="mb-12 px-2 flex items-center justify-between">
          <Link href="/admin" className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
            AdminB2B
            <span className="block text-xs font-medium text-indigo-300 mt-1 uppercase tracking-widest">Portal Moderasi</span>
          </Link>
        </div>
        
        <ul className="space-y-3 font-medium flex-1">
          <li>
            <Link href="/admin" className={getLinkClass('/admin')}>
              <Activity className={getIconClass('/admin')} />
              <span className="ms-4 text-sm">Overviu Aktivitas Sistem</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/users" className={getLinkClass('/admin/users')}>
              <Users className={getIconClass('/admin/users')} />
              <span className="ms-4 text-sm">Kelola Pengguna Sistem</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/tinjauan-konten" className={getLinkClass('/admin/tinjauan-konten')}>
              <Library className={getIconClass('/admin/tinjauan-konten')} />
              <span className="ms-4 text-sm">Tinjauan Konten Katalog</span>
            </Link>
          </li>
        </ul>
        
        <div className="pt-6 mt-6 border-t border-indigo-800/50">
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full flex items-center p-3 text-red-300 rounded-xl hover:bg-red-500/10 hover:text-red-200 transition-all group text-left">
              <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="ms-4 font-medium text-sm">Keluar</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

