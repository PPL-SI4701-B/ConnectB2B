import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import {
  LayoutDashboard,
  Store,
  Search,
  ArrowRightLeft,
  Star,
  User,
  LogOut,
  Bell
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
    { href: '/sewa-alat', label: 'Sewa Alat', icon: Search },
    { href: '/request-masuk', label: 'Request Masuk', icon: Bell },
    { href: '/dashboard/transaksi', label: 'Transaksi', icon: ArrowRightLeft },
    { href: '/dashboard/ulasan', label: 'Ulasan', icon: Star },
  ];

  const industriLinks = [
    { href: '/dashboard-industri', label: 'Dashboard Industri', icon: LayoutDashboard },
    { href: '/pencarian', label: 'Cari Supplier UMKM', icon: Search },
    { href: '/keranjang', label: 'Keranjang Kolaborasi', icon: Store },
    { href: '/pantau-transaksi', label: 'Pantau Transaksi', icon: ArrowRightLeft },
    { href: '/dashboard-industri/ulasan', label: 'Beri Ulasan', icon: Star },
  ];

  const links = isIndustri ? industriLinks : umkmLinks;
  const brandColor = isIndustri ? 'text-secondary' : 'text-primary';

  return (
    <aside className="w-[280px] bg-card-bg shadow-sm flex flex-col hidden md:flex min-h-screen transition-all">
      <div className="h-full px-5 py-[30px] flex flex-col">
        <div className="mb-[50px] px-2 flex items-center gap-2.5">
          <div className={`${brandColor}`}>
            {isIndustri ? <LayoutDashboard className="w-6 h-6" /> : <Store className="w-6 h-6" />}
          </div>
          <span className="text-xl font-bold text-gray-900">
            Connect<span className={brandColor}>{isIndustri ? 'Industri' : 'B2B'}</span>
          </span>
        </div>

        <ul className="space-y-2.5 flex-1">
          {links.map((link) => {
            const Icon = link.icon;
            // Next.js App Router Sidebar doesn't have an `active` state right now since it's a Server Component.
            // We'll give it a hover effect mimicking the active state in mockup.
            return (
              <li key={link.href} className="rounded-lg overflow-hidden relative">
                <Link href={link.href} className="flex items-center gap-[15px] px-5 py-[14px] text-text-muted hover:bg-[#f4f7fe] hover:text-primary transition-all font-semibold text-[15px] group">
                  <Icon className="w-5 h-5 group-hover:text-primary transition-colors" />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="pt-6 mt-6 space-y-2.5">
          <Link href="/profil" className="flex items-center gap-[15px] px-5 py-[14px] text-text-muted hover:bg-[#f4f7fe] hover:text-primary rounded-lg transition-all font-semibold text-[15px] group">
            <User className="w-5 h-5 group-hover:text-primary transition-colors" />
            <span>{isIndustri ? 'Profil Eksekutif' : 'Profil'}</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full flex items-center gap-[15px] px-5 py-[14px] text-danger hover:bg-[#feeceb] rounded-lg transition-all font-semibold text-[15px] group">
              <LogOut className="w-5 h-5 group-hover:text-danger transition-colors" />
              <span>{isIndustri ? 'Ganti Peran (Log Out)' : 'Keluar'}</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
