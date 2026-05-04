import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Tag, Settings, FileText, Package } from 'lucide-react';

export const metadata = {
  title: 'Detail Alat & Mesin | ConnectB2B',
};

const formatRupiah = (angka?: number | null) => {
  if (!angka) return 'Penawaran Khusus';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(angka);
};

export default async function DetailAlatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch equipment
  const { data: alat } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', Number(id))
    .eq('user_id', user.id)
    .single();

  if (!alat) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 text-black">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/katalog" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{alat.nama}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Image */}
        {alat.gambar_url ? (
          <img
            src={alat.gambar_url}
            alt={alat.nama}
            className="w-full h-72 object-cover"
          />
        ) : (
          <div className="w-full h-72 bg-gradient-to-br from-indigo-50 to-amber-50 flex items-center justify-center">
            <Settings className="w-24 h-24 text-indigo-200" />
          </div>
        )}

        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  <Package className="w-3 h-3" />
                  Alat & Mesin Produksi
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  alat.status === 'tersedia' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {alat.status === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia'}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{alat.nama}</h1>
            </div>
            <Link
              href={`/dashboard/katalog/alat/${alat.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Pencil className="w-4 h-4" /> Edit Alat
            </Link>
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-xl p-5">
              <p className="text-sm text-indigo-600 font-medium mb-1">Estimasi Harga Sewa</p>
              <p className="text-3xl font-bold text-indigo-700">{formatRupiah(alat.harga_sewa)} <span className="text-sm font-normal">/ Hari</span></p>
            </div>
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
              <p className="text-sm text-slate-600 font-medium mb-1">Stok / Jumlah Unit</p>
              <p className="text-3xl font-bold text-slate-700">{alat.stok || 0} <span className="text-sm font-normal text-slate-500">Unit</span></p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <FileText className="w-5 h-5 text-indigo-500" />
              Deskripsi & Spesifikasi
            </h2>
            {alat.deskripsi ? (
              <div className="bg-gray-50 rounded-xl p-5 text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {alat.deskripsi}
              </div>
            ) : (
              <p className="text-gray-400 italic">Belum ada deskripsi untuk alat/mesin ini.</p>
            )}
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">ID Alat</p>
              <p className="text-sm font-medium text-gray-700">#EQ-{alat.id.toString().padStart(4, '0')}</p>
            </div>
            {alat.created_at && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Ditambahkan</p>
                <p className="text-sm font-medium text-gray-700">
                  {new Date(alat.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
