'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Mail,
  Lock,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ChevronRight,
  ArrowLeft,
  CreditCard,
  User
} from 'lucide-react'

const BANK_OPTIONS = [
  'BCA', 'BRI', 'BNI', 'Mandiri', 'CIMB Niaga', 'Danamon', 'Permata',
  'BSI', 'BTN', 'Maybank', 'OCBC', 'Panin', 'Lainnya'
]

export default function RegisterUMKM() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Step 1: Data Akun
  const [formData, setFormData] = useState({
    nama_usaha: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Step 2: Data Rekening Bank
  const [bankData, setBankData] = useState({
    nama_bank: '',
    no_rekening: '',
    atas_nama_rekening: '',
  })

  // Step 3: Dokumen Legalitas
  const [files, setFiles] = useState<{ NIB: File | null; NPWP: File | null }>({
    NIB: null,
    NPWP: null
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setBankData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'NIB' | 'NPWP') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setErrorMsg(`Format file ${type} harus PDF.`); return }
    if (file.size > 5 * 1024 * 1024) { setErrorMsg(`Ukuran file ${type} tidak boleh lebih dari 5MB.`); return }
    setErrorMsg('')
    setFiles(prev => ({ ...prev, [type]: file }))
  }

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!formData.nama_usaha.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      setErrorMsg('Semua field harus diisi.'); return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) { setErrorMsg('Format email tidak valid.'); return }
    if (formData.password.length < 8) { setErrorMsg('Kata sandi minimal 8 karakter.'); return }
    if (formData.password !== formData.confirmPassword) { setErrorMsg('Konfirmasi kata sandi tidak cocok.'); return }
    setStep(2)
  }

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!bankData.nama_bank || !bankData.no_rekening.trim() || !bankData.atas_nama_rekening.trim()) {
      setErrorMsg('Semua data rekening harus diisi.'); return
    }
    if (!/^\d{6,20}$/.test(bankData.no_rekening.trim())) {
      setErrorMsg('Nomor rekening harus berupa angka (6-20 digit).'); return
    }
    setStep(3)
  }

  const handleSubmitFinal = async () => {
    if (!files.NIB || !files.NPWP) {
      setErrorMsg('Anda harus mengunggah kedua dokumen (NIB dan NPWP).')
      return
    }

    setLoading(true)
    setErrorMsg('')
    let isSuccess = false

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'umkm',
            nama: formData.nama_usaha,
            nama_usaha: formData.nama_usaha
          }
        }
      })

      if (authError) throw new Error(`Gagal mendaftar: ${authError.message}`)
      if (!authData.user) throw new Error('Terjadi kesalahan yang tidak diketahui saat mendaftar.')

      const userId = authData.user.id
      const timestamp = new Date().getTime()

      // Update norek di tabel umkm (row sudah dibuat oleh trigger handle_new_user)
      await supabase
        .from('umkm')
        .update({
          no_rekening: bankData.no_rekening.trim(),
          nama_bank: bankData.nama_bank,
          atas_nama_rekening: bankData.atas_nama_rekening.trim(),
        } as any)
        .eq('user_id', userId)

      const uploadPromises = [
        { type: 'NIB', file: files.NIB },
        { type: 'NPWP', file: files.NPWP }
      ].map(async ({ type, file }) => {
        const filePath = `umkm/${userId}/${type}_${timestamp}.pdf`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dokumen')
          .upload(filePath, file as File, { upsert: true })
        if (uploadError) throw new Error(`Gagal mengunggah ${type}: ${uploadError.message}`)
        return { type, path: uploadData.path }
      })

      const uploadedFiles = await Promise.all(uploadPromises)

      const dokumenInserts = uploadedFiles.map(({ type, path }) => ({
        user_id: userId,
        jenis_dokumen: type,
        file_url: path,
        status_verifikasi: 'menunggu' as const
      }))

      const { error: dbError } = await supabase
        .from('dokumen_legalitas')
        .insert(dokumenInserts as any)

      if (dbError) throw new Error(`Gagal menyimpan data dokumen: ${dbError.message}`)

      isSuccess = true
      setSuccessMsg('Registrasi berhasil! Akun Anda sedang menunggu verifikasi admin. Anda akan menerima notifikasi setelah dokumen diverifikasi.')

      setTimeout(() => { router.push('/login') }, 3000)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat mendaftarkan akun.')
    } finally {
      if (!isSuccess) setLoading(false)
    }
  }

  const steps = [
    { label: 'Data Akun' },
    { label: 'Rekening Bank' },
    { label: 'Dokumen Legalitas' },
  ]

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-8 select-none">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              ConnectB2B
            </span>
          </div>

          <Link href="/register" className="flex items-center gap-2 text-sm text-gray-500 font-semibold mb-6 hover:text-gray-900 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Pilihan
          </Link>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Daftar UMKM</h2>
          <p className="text-gray-500 mb-8">
            Daftarkan usaha Anda dan bergabunglah dengan ribuan mitra industri.
          </p>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-2">
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold transition-colors flex-shrink-0 ${
                  step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-1 flex-1 rounded-full transition-colors ${step > i + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs font-medium text-gray-500 mb-8">
            {steps.map((s, i) => (
              <span key={i} className={step === i + 1 ? 'text-gray-900 font-semibold' : ''}>{s.label}</span>
            ))}
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 flex gap-3 text-red-700 items-start">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 flex gap-3 text-green-700 items-start border border-green-100">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}

          {/* STEP 1: Data Akun */}
          {step === 1 && !successMsg && (
            <form onSubmit={handleNextStep1} className="space-y-5 animate-in slide-in-from-left-4 fade-in duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Badan Usaha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="text" name="nama_usaha" value={formData.nama_usaha} onChange={handleInputChange}
                    className="pl-10 block w-full rounded-lg border border-gray-300 bg-white py-2.5 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="PT / CV / Nama Usaha" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                    className="pl-10 block w-full rounded-lg border border-gray-300 bg-white py-2.5 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="nama@email.com" required />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange}
                      className="pl-10 block w-full rounded-lg border border-gray-300 bg-white py-2.5 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Min. 8 karakter" required />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Sandi</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                      className="pl-10 block w-full rounded-lg border border-gray-300 bg-white py-2.5 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ulangi sandi" required />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-8 shadow-sm">
                Lanjutkan <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* STEP 2: Data Rekening Bank */}
          {step === 2 && !successMsg && (
            <form onSubmit={handleNextStep2} className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <span className="font-semibold block mb-1">Informasi Rekening Pencairan</span>
                Data rekening ini digunakan oleh Admin untuk mencairkan pembayaran dari transaksi ke akun Anda setelah barang terkirim.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
                <select name="nama_bank" value={bankData.nama_bank} onChange={handleBankChange} required
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all">
                  <option value="">-- Pilih Bank --</option>
                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="text" name="no_rekening" value={bankData.no_rekening} onChange={handleBankChange}
                    className="pl-10 block w-full rounded-lg border border-gray-300 bg-white py-2.5 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Contoh: 1234567890" inputMode="numeric" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atas Nama Rekening</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="text" name="atas_nama_rekening" value={bankData.atas_nama_rekening} onChange={handleBankChange}
                    className="pl-10 block w-full rounded-lg border border-gray-300 bg-white py-2.5 text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Nama sesuai buku tabungan" required />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 px-4 text-gray-700 bg-white border border-gray-300 hover:border-gray-400 rounded-lg font-semibold transition-colors">
                  Kembali
                </button>
                <button type="submit" className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                  Lanjutkan <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Upload Dokumen */}
          {step === 3 && !successMsg && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <span className="font-semibold block mb-1">Wajib Diisi</span>
                Unggah dokumen perizinan usaha Anda (Hanya PDF, maks 5MB). Dokumen akan diverifikasi oleh tim Admin sebelum akun dapat digunakan.
              </div>

              {/* NIB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Induk Berusaha (NIB)</label>
                {files.NIB ? (
                  <div className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-semibold text-gray-900 truncate">{files.NIB.name}</p>
                        <p className="text-xs text-blue-600 font-medium">{(files.NIB.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={() => setFiles(p => ({ ...p, NIB: null }))} className="p-2 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 transition-colors rounded-lg cursor-pointer group">
                    <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                    <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Klik untuk unggah NIB</p>
                    <p className="text-xs text-gray-500 mt-1">PDF maks. 5MB</p>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileChange(e, 'NIB')} />
                  </label>
                )}
              </div>

              {/* NPWP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NPWP Badan / Pribadi</label>
                {files.NPWP ? (
                  <div className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-semibold text-gray-900 truncate">{files.NPWP.name}</p>
                        <p className="text-xs text-blue-600 font-medium">{(files.NPWP.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={() => setFiles(p => ({ ...p, NPWP: null }))} className="p-2 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 transition-colors rounded-lg cursor-pointer group">
                    <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                    <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Klik untuk unggah NPWP</p>
                    <p className="text-xs text-gray-500 mt-1">PDF maks. 5MB</p>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileChange(e, 'NPWP')} />
                  </label>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setStep(2)} disabled={loading}
                  className="flex-1 py-3 px-4 text-gray-700 bg-white border border-gray-300 hover:border-gray-400 rounded-lg font-semibold transition-colors disabled:opacity-50">
                  Kembali
                </button>
                <button onClick={handleSubmitFinal} disabled={loading || !files.NIB || !files.NPWP}
                  className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                  {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Memproses...</>) : 'Daftarkan Akun'}
                </button>
              </div>
            </div>
          )}

          {!successMsg && (
            <p className="text-center mt-8 text-sm text-gray-500 font-medium">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">Masuk di sini</Link>
            </p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-blue-600 via-indigo-700 to-indigo-900 overflow-hidden items-center justify-center">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10 text-center px-12 lg:px-24">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">Hubungkan<br />Bisnis Anda</h1>
          <p className="text-lg text-indigo-100 max-w-md mx-auto leading-relaxed opacity-90">
            Lebih dari ribuan mitra telah terhubung. Daftar sekarang dan temukan partner strategis terbaik untuk mempercepat skala operasi bisnis Anda.
          </p>
        </div>
      </div>
    </div>
  )
}
