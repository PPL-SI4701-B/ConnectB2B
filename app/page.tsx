import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import {
  Building2, Store, ArrowRight,
  ShieldCheck, Search, Handshake, Zap, TrendingUp, CheckCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const supabase = await createClient();

  const [
    { count: jumlahUMKM },
    { count: jumlahIndustri },
  ] = await Promise.all([
    supabase.from('umkm').select('*', { count: 'exact', head: true }),
    supabase.from('industri').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div className="min-h-screen bg-white text-slate-800 overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between h-18 items-center py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4318ff] to-[#00b5d8] flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-500/30">
              C
            </div>
            <span className="text-[22px] font-extrabold bg-gradient-to-r from-[#4318ff] to-[#00b5d8] bg-clip-text text-transparent tracking-tight">
              ConnectB2B
            </span>
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/" className="text-[#4318ff] font-semibold text-[15px]">Beranda</Link>
            <Link href="/pencarian" className="text-slate-600 hover:text-[#4318ff] font-medium text-[15px] transition-colors">Produk</Link>
            <Link href="#how-it-works" className="text-slate-600 hover:text-[#4318ff] font-medium text-[15px] transition-colors">Cara Kerja</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex px-5 py-2.5 border-2 border-[#4318ff] text-[#4318ff] font-semibold rounded-xl hover:bg-indigo-50 transition-colors text-[14px]">
              Masuk
            </Link>
            <Link href="/register" className="px-5 py-2.5 bg-gradient-to-r from-[#4318ff] to-[#6C3EFF] text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-indigo-500/30 transition-all text-[14px]">
              Daftar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-28 overflow-hidden bg-gradient-to-br from-[#f4f7fe] via-white to-[#eef2ff]">
        {/* Animated blob backgrounds */}
        <div className="absolute top-0 left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-[#4318ff]/20 to-[#00b5d8]/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-[#00b5d8]/20 to-[#4318ff]/10 rounded-full blur-3xl animate-blob delay-400" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left — text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-[#4318ff] px-4 py-1.5 rounded-full text-[13px] font-semibold mb-6 animate-fade-up">
                <Zap className="w-3.5 h-3.5" />
                Platform B2B #1 untuk UMKM & Industri Indonesia
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-[#2b3674] leading-tight mb-6 animate-fade-up delay-100">
                Jembatan Bisnis <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4318ff] to-[#00b5d8] animate-gradient-x">
                  UMKM &amp; Industri
                </span>
              </h1>
              <p className="text-lg text-slate-500 max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed animate-fade-up delay-200">
                ConnectB2B menghadirkan ekosistem digital terpercaya yang menghubungkan ribuan UMKM lokal dengan mitra industri. Temukan peluang, jalin kerja sama, dan tumbuh bersama.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-up delay-300">
                <Link href="/register?role=umkm" className="group px-8 py-4 bg-gradient-to-r from-[#4318ff] to-[#6C3EFF] text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 animate-pulse-ring">
                  Daftar sebagai UMKM
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/register?role=industri" className="px-8 py-4 bg-white border-2 border-slate-200 text-[#2b3674] font-bold rounded-2xl shadow-sm hover:border-[#4318ff]/30 hover:bg-indigo-50/50 transition-all flex items-center justify-center">
                  Daftar sebagai Industri
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-500 animate-fade-up delay-400">
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Verifikasi Terjamin</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Tanpa Biaya Pendaftaran</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Keamanan Data</div>
              </div>
            </div>

            {/* Right — floating visual */}
            <div className="flex-1 relative flex items-center justify-center min-h-[380px] animate-fade-right delay-200">
              {/* Central glowing card */}
              <div className="relative w-[320px] z-10 animate-float">
                <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-200 p-7 border border-indigo-50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4318ff] to-[#00b5d8] flex items-center justify-center text-white font-bold text-lg">C</div>
                    <div>
                      <div className="font-bold text-[#2b3674] text-[15px]">ConnectB2B</div>
                      <div className="text-xs text-slate-400">Platform B2B Terpercaya</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3">
                      <ShieldCheck className="w-4 h-4 text-[#4318ff] shrink-0" />
                      <span className="text-[13px] font-semibold text-[#2b3674]">Legalitas Terverifikasi</span>
                    </div>
                    <div className="flex items-center gap-3 bg-cyan-50 rounded-xl px-4 py-3">
                      <Search className="w-4 h-4 text-[#00b5d8] shrink-0" />
                      <span className="text-[13px] font-semibold text-[#2b3674]">Pencarian Mitra Cerdas</span>
                    </div>
                    <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
                      <Handshake className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[13px] font-semibold text-[#2b3674]">Kerja Sama Aman &amp; Transparan</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating decorators */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-[#4318ff] to-indigo-800 rounded-2xl opacity-20 animate-float-slow" />
              <div className="absolute bottom-8 left-4 w-14 h-14 bg-gradient-to-br from-[#00b5d8] to-cyan-700 rounded-xl opacity-20 animate-float delay-300" />
              <div className="absolute top-1/2 -left-8 w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full opacity-20 animate-float-slow delay-200" />
            </div>
          </div>
        </div>
      </section>

      {/* ── STAT STRIP ── */}
      <section className="bg-gradient-to-r from-[#4318ff] to-[#00b5d8] py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
            {[
              { icon: Store, value: `${jumlahUMKM ?? 0}+`, label: 'UMKM Aktif' },
              { icon: Building2, value: `${jumlahIndustri ?? 0}+`, label: 'Mitra Industri' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center text-white animate-fade-up">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-extrabold mb-1">{value}</div>
                <div className="text-sm font-medium text-white/80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 bg-[#f4f7fe]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-16 animate-fade-up">
            <span className="text-[#4318ff] font-bold text-[13px] uppercase tracking-widest">Mengapa ConnectB2B?</span>
            <h2 className="text-4xl font-extrabold text-[#2b3674] mt-3 mb-4">Platform Lengkap untuk Kolaborasi B2B</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Semua yang Anda butuhkan untuk membangun kerja sama bisnis yang kuat, aman, dan menguntungkan — dalam satu platform.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                color: 'from-[#4318ff] to-indigo-700',
                bg: 'bg-indigo-50',
                title: 'Terverifikasi & Terpercaya',
                desc: 'Setiap UMKM dan mitra industri melewati proses verifikasi ketat. Anda hanya bertransaksi dengan bisnis yang telah terbukti kredibilitasnya.',
                delay: '',
              },
              {
                icon: Search,
                color: 'from-[#00b5d8] to-cyan-600',
                bg: 'bg-cyan-50',
                title: 'Pencarian Cerdas',
                desc: 'Temukan mitra bisnis yang tepat berdasarkan kategori produk, lokasi, dan spesifikasi kebutuhan Anda dengan teknologi pencarian canggih.',
                delay: 'delay-200',
              },
              {
                icon: TrendingUp,
                color: 'from-emerald-500 to-teal-600',
                bg: 'bg-emerald-50',
                title: 'Pantau Progres Real-time',
                desc: 'Kelola semua kerja sama dalam satu dashboard. Pantau status produksi, kirim update progres, dan terima notifikasi otomatis.',
                delay: 'delay-400',
              },
            ].map(({ icon: Icon, color, bg, title, desc, delay }) => (
              <div key={title} className={`bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-100 border border-slate-100 transition-all hover:-translate-y-1 animate-fade-up ${delay}`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#2b3674] mb-3">{title}</h3>
                <p className="text-slate-500 text-[15px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-[#2b3674] to-[#4318ff] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00b5d8]/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl animate-blob delay-400" />
        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="text-center mb-16 animate-fade-up">
            <span className="text-[#00b5d8] font-bold text-[13px] uppercase tracking-widest">Mulai Sekarang</span>
            <h2 className="text-4xl font-extrabold mt-3 mb-4">Cara Kerja ConnectB2B</h2>
            <p className="text-indigo-200 max-w-xl mx-auto">Tiga langkah mudah untuk memulai kolaborasi bisnis yang saling menguntungkan dan berkelanjutan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {[
              { num: '01', icon: ShieldCheck, color: 'bg-[#4318ff]', title: 'Daftar & Verifikasi', desc: 'Buat akun sebagai UMKM atau Industri. Lengkapi profil bisnis Anda dan tunggu proses verifikasi tim kami yang cepat dan aman.' },
              { num: '02', icon: Search, color: 'bg-[#00b5d8]', title: 'Temukan Mitra', desc: 'Jelajahi katalog produk UMKM terverifikasi, cari sesuai spesifikasi kebutuhan produksi, atau terima request langsung dari industri.' },
              { num: '03', icon: Handshake, color: 'bg-emerald-500', title: 'Jalin Kerja Sama', desc: 'Lakukan negosiasi transparan, setujui kesepakatan, dan pantau progres produksi secara real-time hingga selesai.' },
            ].map(({ num, icon: Icon, color, title, desc }, i) => (
              <div key={num} className={`relative text-center animate-fade-up delay-${(i + 1) * 200}`}>
                <div className="relative inline-block mb-6">
                  <div className={`w-20 h-20 mx-auto ${color} rounded-3xl flex items-center justify-center shadow-2xl`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white border-2 border-white/30">
                    {num}
                  </div>
                </div>
                <h3 className="text-xl font-extrabold mb-3">{title}</h3>
                <p className="text-indigo-200 text-[15px] leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 to-cyan-50/40" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-[#4318ff] px-4 py-1.5 rounded-full text-[13px] font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" /> Bergabung Sekarang — Gratis!
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#2b3674] mb-6 leading-tight">
            Siap Tumbuh Bersama <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4318ff] to-[#00b5d8]">ConnectB2B?</span>
          </h2>
          <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Bergabunglah dengan ratusan bisnis yang telah mempercepat pertumbuhan mereka melalui ekosistem digital ConnectB2B.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register?role=umkm" className="px-8 py-4 bg-gradient-to-r from-[#4318ff] to-[#6C3EFF] text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              Mulai sebagai UMKM <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/register?role=industri" className="px-8 py-4 bg-white border-2 border-slate-200 text-[#2b3674] font-bold rounded-2xl shadow-sm hover:border-[#4318ff]/30 hover:bg-indigo-50/50 transition-all flex items-center justify-center">
              Mulai sebagai Industri
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1a1f3c] py-14 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4318ff] to-[#00b5d8] flex items-center justify-center text-white font-extrabold text-lg">
                  C
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">ConnectB2B</span>
              </div>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Platform digital yang menghubungkan UMKM dan Industri untuk kolaborasi bisnis yang lebih baik.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className="flex gap-6 text-sm text-slate-400">
                <Link href="/pencarian" className="hover:text-white transition-colors">Produk</Link>
                <Link href="/login" className="hover:text-white transition-colors">Masuk</Link>
                <Link href="/register" className="hover:text-white transition-colors">Daftar</Link>
              </div>
              <p className="text-slate-500 text-sm">© 2026 ConnectB2B — Kelompok B PPL</p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
