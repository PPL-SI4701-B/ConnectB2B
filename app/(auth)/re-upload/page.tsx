'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowLeft,
  RefreshCw,
  FileWarning,
  ShieldAlert,
} from 'lucide-react'

type RejectedDoc = {
  id: number
  jenis_dokumen: string
  file_url: string
  status_verifikasi: string
  catatan_admin: string | null
}

export default function ReUploadPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('umkm')
  const [rejectedDocs, setRejectedDocs] = useState<RejectedDoc[]>([])
  const [files, setFiles] = useState<Record<string, File | null>>({})

  // Fetch user data and rejected documents
  useEffect(() => {
    async function init() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Fetch user role to determine storage path
      const { data: userProfile } = await (supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single() as any)

      if (userProfile?.role) {
        setUserRole(userProfile.role)
      }

      // Fetch all rejected documents for this user
      const { data: docs, error: docError } = await (supabase
        .from('dokumen_legalitas')
        .select('id, jenis_dokumen, file_url, status_verifikasi, catatan_admin')
        .eq('user_id', user.id)
        .eq('status_verifikasi', 'ditolak') as any)

      if (docError) {
        console.error('Error fetching rejected docs:', docError)
        setErrorMsg('Gagal memuat data dokumen yang ditolak.')
      } else if (!docs || docs.length === 0) {
        // No rejected docs — maybe user shouldn't be here
        // Check if they have pending docs
        const { data: pendingDocs } = await (supabase
          .from('dokumen_legalitas')
          .select('id')
          .eq('user_id', user.id)
          .eq('status_verifikasi', 'menunggu') as any)

        if (pendingDocs && pendingDocs.length > 0) {
          router.push('/status-verifikasi?status=menunggu')
          return
        }

        // Check if verified
        const { data: profile } = await (supabase
          .from('users')
          .select('status_verifikasi')
          .eq('id', user.id)
          .single() as any)

        if (profile?.status_verifikasi === 'terverifikasi') {
          router.push('/dashboard')
          return
        }

        setErrorMsg('Tidak ada dokumen yang ditolak untuk di-upload ulang.')
      } else {
        setRejectedDocs(docs)
        // Initialize file state for each rejected document
        const initialFiles: Record<string, File | null> = {}
        docs.forEach((doc: RejectedDoc) => {
          initialFiles[doc.jenis_dokumen] = null
        })
        setFiles(initialFiles)
      }

      setLoading(false)
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setErrorMsg(`Format file ${docType} harus PDF.`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(`Ukuran file ${docType} tidak boleh lebih dari 10MB.`)
      return
    }

    setErrorMsg('')
    setFiles(prev => ({ ...prev, [docType]: file }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>, docType: string) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setErrorMsg(`Format file ${docType} harus PDF.`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(`Ukuran file ${docType} tidak boleh lebih dari 10MB.`)
      return
    }

    setErrorMsg('')
    setFiles(prev => ({ ...prev, [docType]: file }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const removeFile = useCallback((docType: string) => {
    setFiles(prev => ({ ...prev, [docType]: null }))
  }, [])

  const hasAnyFile = Object.values(files).some(f => f !== null)

  const handleSubmit = async () => {
    if (!userId) return

    // Check that at least one file is selected
    const filesToUpload = Object.entries(files).filter(([, file]) => file !== null)
    if (filesToUpload.length === 0) {
      setErrorMsg('Pilih setidaknya satu dokumen untuk diunggah ulang.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const timestamp = new Date().getTime()

      for (const [docType, file] of filesToUpload) {
        if (!file) continue

        // Upload new file to storage
        // Use user role as storage folder (umkm or industri) — required by RLS policy
        const filePath = `${userRole}/${userId}/${docType}_${timestamp}.pdf`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dokumen')
          .upload(filePath, file, { upsert: true })

        if (uploadError) {
          throw new Error(`Gagal mengunggah ${docType}: ${uploadError.message}`)
        }

        // Update the existing dokumen_legalitas record
        // The check_dokumen_update trigger will automatically reset status_verifikasi to 'menunggu'
        // and clear catatan_admin when file_url changes
        const { error: updateError } = await (supabase
          .from('dokumen_legalitas')
          .update({
            file_url: uploadData.path,
            status_verifikasi: 'menunggu' as const,
            catatan_admin: null,
          })
          .eq('user_id', userId)
          .eq('jenis_dokumen', docType) as any)

        if (updateError) {
          throw new Error(`Gagal memperbarui data ${docType}: ${updateError.message}`)
        }
      }

      // Also update user status back to menunggu
      await (supabase
        .from('users')
        .update({ status_verifikasi: 'menunggu' as const })
        .eq('id', userId) as any)

      setSuccessMsg('Dokumen berhasil diunggah ulang! Akun Anda akan diverifikasi kembali oleh tim admin.')

      setTimeout(() => {
        router.push('/status-verifikasi?status=menunggu')
      }, 3000)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah dokumen.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-500 font-medium">Memuat data dokumen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left: Form Area */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12">
        <div className="w-full max-w-lg mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-8 select-none">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
              ConnectB2B
            </span>
          </div>

          <Link
            href="/status-verifikasi?status=ditolak"
            className="flex items-center gap-2 text-sm text-gray-500 font-semibold mb-6 hover:text-gray-900 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Ulang Dokumen 📄</h2>
          <p className="text-gray-500 mb-8">
            Perbaiki dan unggah kembali dokumen legalitas yang ditolak. Setelah diunggah, dokumen akan ditinjau kembali oleh tim admin.
          </p>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex gap-3 text-red-700 items-start animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 flex gap-3 text-green-700 items-start shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}

          {!successMsg && rejectedDocs.length > 0 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
              {/* Info Box */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 shadow-sm">
                <span className="font-semibold block mb-1">Perhatian</span>
                Unggah ulang dokumen yang ditolak dengan dokumen yang sudah diperbaiki. Format PDF, maksimal 10MB per file.
              </div>

              {/* Document Upload Cards */}
              {rejectedDocs.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Rejection Reason Header */}
                  <div className="bg-red-50/80 border-b border-red-100 px-5 py-3.5">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-red-800">
                          {doc.jenis_dokumen} — Ditolak
                        </h3>
                        <p className="text-xs text-red-600 mt-0.5">
                          {doc.catatan_admin || 'Tidak ada catatan spesifik dari admin.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Area */}
                  <div className="p-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload ulang {doc.jenis_dokumen}
                    </label>
                    {files[doc.jenis_dokumen] ? (
                      <div className="flex items-center justify-between p-4 border border-indigo-200 bg-indigo-50 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {files[doc.jenis_dokumen]!.name}
                            </p>
                            <p className="text-xs text-indigo-600 font-medium">
                              {(files[doc.jenis_dokumen]!.size / 1024 / 1024).toFixed(2)} MB • PDF
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(doc.jenis_dokumen)}
                          disabled={submitting}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <label
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/50 transition-colors rounded-xl cursor-pointer group"
                        onDrop={(e) => handleDrop(e, doc.jenis_dokumen)}
                        onDragOver={handleDragOver}
                      >
                        <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 transition-colors mb-2" />
                        <p className="text-sm font-medium text-gray-600 group-hover:text-indigo-600">
                          Klik atau drag untuk unggah {doc.jenis_dokumen}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Format PDF maks. 10MB</p>
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, doc.jenis_dokumen)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}

              {/* Submit Button */}
              <div className="flex gap-4 pt-2">
                <Link
                  href="/status-verifikasi?status=ditolak"
                  className="flex-1 py-3 px-4 text-center text-gray-700 bg-white border border-gray-300 hover:border-gray-400 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </Link>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !hasAnyFile}
                  className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm hover:shadow-md disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5" />
                      Upload Ulang ({Object.values(files).filter(f => f !== null).length} Dokumen)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!successMsg && rejectedDocs.length === 0 && !errorMsg && (
            <div className="text-center py-12 animate-in fade-in duration-300">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileWarning className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Dokumen Ditolak</h3>
              <p className="text-sm text-gray-500 mb-6">
                Semua dokumen Anda sedang dalam proses verifikasi atau sudah diverifikasi.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Login
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right: Decorative Panel */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-900 overflow-hidden items-center justify-center">
        {/* Decorative Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 text-center px-12 lg:px-24">
          <div className="mx-auto w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 border border-white/20">
            <RefreshCw className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Perbaiki &<br />Kirim Ulang
          </h1>
          <p className="text-lg text-indigo-100 max-w-md mx-auto leading-relaxed opacity-90">
            Dokumen yang sudah diperbaiki akan ditinjau kembali oleh tim admin ConnectB2B. Pastikan dokumen yang diunggah sudah sesuai persyaratan.
          </p>
        </div>
      </div>
    </div>
  )
}
