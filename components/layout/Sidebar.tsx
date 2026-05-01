import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import {
  LayoutDashboard,
  Store,
  Search,
  ArrowRightLeft,
  Star,
  User,
  LogOut
} from 'lucide-react';

export default async function Sidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = 'umkm';
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as any;
    if (userData?.role) {
      role = userData.role.toLowerCase();
    }
  }

  const isIndustri = role === 'industri';

  const umkmLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/katalog', label: 'Katalog Produk', icon: Store },
    { href: '/pencarian', label: 'Cari Supplier / Alat', icon: Search },
    { href: '/dashboard/transaksi', label: 'Transaksi', icon: ArrowRightLeft },
    { href: '/dashboard/ulasan', label: 'Ulasan', icon: Star },
  ];

  const industriLinks = [
    { href: '/dashboard-industri', label: 'Dasbor Industri', icon: LayoutDashboard },
    { href: '/pencarian', label: 'Cari Supplier UMKM', icon: Search },
    { href: '/dashboard-industri/transaksi', label: 'Pantau Transaksi', icon: ArrowRightLeft },
    { href: '/dashboard-industri/ulasan', label: 'Beri Ulasan', icon: Star },
  ];

  const links = isIndustri ? industriLinks : umkmLinks;
  const brandColor = isIndustri ? 'text-cyan-500' : 'text-indigo-600';

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex min-h-screen">
      <div className="h-full px-4 py-6 flex flex-col">
        <div className="mb-10 px-2 flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-gray-100 ${brandColor}`}>
            {isIndustri ? <LayoutDashboard className="w-6 h-6" /> : <Store className="w-6 h-6" />}
          </div>
          <span className="text-xl font-bold text-gray-900">
            Connect<span className={brandColor}>{isIndustri ? 'Industri' : 'B2B'}</span>
          </span>
        </div>

        <ul className="space-y-2 font-medium flex-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link href={link.href} className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors group">
                  <Icon className={`w-5 h-5 text-gray-400 group-hover:${brandColor} transition-colors`} />
                  <span className="ms-3">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="pt-6 mt-6 border-t border-gray-100 space-y-2">
          <Link href="/profil" className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors group">
            <User className={`w-5 h-5 text-gray-400 group-hover:${brandColor} transition-colors`} />
            <span className="ms-3">{isIndustri ? 'Profil Eksekutif' : 'Profil'}</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full flex items-center p-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors group">
              <LogOut className="w-5 h-5 text-red-500 group-hover:text-red-700 transition-colors" />
              <span className="ms-3">{isIndustri ? 'Ganti Peran (Log Out)' : 'Keluar'}</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
