import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';

export default function UsersPlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
        <Users className="w-10 h-10 text-indigo-500" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Kelola Pengguna Sistem (FR-21)</h1>
      <p className="text-slate-500 max-w-md mb-8">
        Halaman Manajemen Akun Pengguna sedang dalam tahap pengembangan (FR-21). Fitur ini akan segera tersedia!
      </p>
      <Link 
        href="/admin" 
        className="inline-flex items-center px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali ke Dashboard Utama
      </Link>
    </div>
  );
}
