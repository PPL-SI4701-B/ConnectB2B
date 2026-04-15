"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Store, Building2, ArrowRight, Loader2, Mail, Lock } from 'lucide-react'

export default function RegisterUMKM() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    namaUsaha: '',
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validasi Dasar
    if (!formData.namaUsaha.trim()) {
      setError('Nama Badan Usaha tidak boleh kosong')
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Format email tidak valid')
      return
    }

    if (formData.password.length < 8) {
      setError('Kata sandi harus minimal 8 karakter')
      return
    }
    
    setLoading(true)
    
    try {
      // 1. Auth SignUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })
      
      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          throw new Error('Alamat email sudah terdaftar.')
        }
        throw new Error(authError.message)
      }
      
      if (authData.user) {
        const userId = authData.user.id
        
        // 2. Insert into users (gunakan upsert jika trigger sudah membuat row awal)
        const { error: userError } = await supabase.from('users').upsert({
          id: userId,
          email: formData.email,
          nama: formData.namaUsaha,
          role: 'umkm' // As per prompt requirement
        })
        
        if (userError && userError.code !== '23505') {
          console.error("User insert error:", userError)
          throw new Error('Gagal menyimpan profil pengguna (server error)')
        }
        
        // 3. Insert into umkm
        const { error: umkmError } = await supabase.from('umkm').upsert({
          user_id: userId,
          nama_usaha: formData.namaUsaha
        })
        
        if (umkmError && umkmError.code !== '23505') {
          console.error("UMKM insert error:", umkmError)
          throw new Error('Gagal menyimpan data UMKM (server error)')
        }
        
        // Berhasil, redirect ke login
        router.push('/login?registered=true')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan pada server. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Form Area */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          
          {/* Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              Connect<span className="text-blue-600">B2B</span>
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Daftar Akun UMKM
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Perluas jangkauan bisnis Anda. Kolaborasi dengan ribuan industri di platform ConnectB2B.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="mt-0.5 rounded-full bg-red-100 p-1">
                  <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Pendaftaran Gagal</h3>
                  <p className="mt-1 text-red-500">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Nama Badan Usaha</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="namaUsaha"
                    value={formData.namaUsaha}
                    onChange={handleChange}
                    disabled={loading}
                    className="block w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-11 pr-3 text-sm text-gray-900 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                    placeholder="Contoh: PT Sukses Makmur"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Alamat Email</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    className="block w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-11 pr-3 text-sm text-gray-900 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                    placeholder="email@perusahaan.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Kata Sandi</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    className="block w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-11 pr-3 text-sm text-gray-900 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                    placeholder="Minimal 8 karakter"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Gunakan kombinasi huruf dan angka agar lebih aman.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:opacity-90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Buat Akun Sekarang
                  <ArrowRight className="absolute inset-y-0 right-4 top-3 h-5 w-5 opacity-0 transition-all group-hover:right-3 group-hover:opacity-100" />
                </>
              )}
            </button>
            <p className="text-center text-sm text-gray-600">
              Sudah punya akun?{' '}
              <Link href="/login" className="font-semibold text-blue-600 transition-colors hover:text-blue-500 hover:underline">
                Masuk di sini
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right Panel - Visual Hero */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gray-900 lg:block">
        {/* Background Gradients & Blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900"></div>
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"></div>
        
        {/* Content Wrapper */}
        <div className="relative flex h-full flex-col items-start justify-center p-24 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-400"></span>
            Tumbuh Bersama ConnectB2B
          </div>
          
          <h2 className="mt-8 text-5xl font-extrabold leading-tight">
            Hubungkan <br /> Bisnis Anda.
          </h2>
          <p className="mt-6 max-w-md text-lg text-blue-100/80">
            Jadikan UMKM Anda bagian dari jaringan rantai pasok industri terpercaya. Proses mudah, transparan, dan terverifikasi.
          </p>

          {/* Glassmorphism Stat Cards */}
          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="text-3xl font-bold text-white">5K+</div>
              <div className="mt-1 text-sm font-medium text-blue-200">UMKM Terdaftar</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="text-3xl font-bold text-white">99%</div>
              <div className="mt-1 text-sm font-medium text-blue-200">Tingkat Kesuksesan Validasi</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
