"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, XCircle, FileWarning, ArrowLeft, RefreshCw, PhoneCall } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase";

function StatusVerifikasiContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const router = useRouter();
  const supabase = createClient();

  const [catatanAdmin, setCatatanAdmin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    async function fetchCatatan() {
      if (status === "ditolak") {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: dokData, error: dokError } = await (supabase
            .from("dokumen_legalitas")
            .select("catatan_admin")
            .eq("user_id", userData.user.id)
            .eq("status_verifikasi", "ditolak")
            .limit(1) as any);

          if (dokData && dokData.length > 0) {
            setCatatanAdmin(dokData[0].catatan_admin);
          }
        }
      }
      setLoading(false);
    }
    fetchCatatan();
  }, [status, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Jika parameter status tidak valid, kembali ke login
  if (status !== "menunggu" && status !== "ditolak") {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {status === "menunggu" ? (
          <>
            <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Akun Anda Sedang Diverifikasi
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Tim admin ConnectB2B sedang meninjau dokumen legalitas Anda. Proses ini biasanya memakan waktu 1-2 hari kerja. Kami akan memberitahu Anda ketika proses selesai.
            </p>
            <button
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
            >
              <ArrowLeft className="w-5 h-5" />
              Kembali ke Login
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Verifikasi Dokumen Ditolak
            </h1>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Maaf, dokumen legalitas Anda belum memenuhi syarat. Silakan periksa catatan dari admin di bawah ini dan unggah ulang dokumen perbaikan.
            </p>
            
            <div className="bg-red-50/80 border border-red-100 rounded-lg p-4 mb-8 text-left">
              <div className="flex items-start gap-3">
                <FileWarning className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800 mb-1">Catatan Penolakan:</h3>
                  <p className="text-sm text-red-600">
                    {catatanAdmin || "Tidak ada catatan spesifik tambahan."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/re-upload"
                className="inline-flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
              >
                <RefreshCw className="w-5 h-5" />
                Upload Ulang Dokumen
              </Link>
              <button
                onClick={() => alert("Menampilkan kontak admin...")}
                className="inline-flex w-full items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                <PhoneCall className="w-5 h-5" />
                Hubungi Admin
              </button>
              <button
                onClick={handleLogout}
                className="inline-block mt-4 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Kembali ke Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StatusVerifikasiPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <StatusVerifikasiContent />
    </Suspense>
  );
}
