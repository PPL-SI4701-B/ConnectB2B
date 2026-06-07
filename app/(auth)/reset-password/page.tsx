"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Tautan reset dari email membuat sesi PASSWORD_RECOVERY.
  // Supabase otomatis memproses token dari URL; kita pastikan ada sesi sebelum mengizinkan ganti password.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Atur Ulang Kata Sandi</h1>
        </div>

        {done ? (
          <div className="mt-6 flex flex-col items-center text-center gap-3 py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="font-semibold text-gray-900">Kata sandi berhasil diperbarui!</p>
            <p className="text-sm text-gray-500">Anda akan diarahkan ke halaman login...</p>
          </div>
        ) : !ready ? (
          <div className="mt-6 text-center py-6">
            <p className="text-sm text-gray-500">
              Memvalidasi tautan reset... Jika halaman ini tidak berubah, pastikan Anda membuka tautan
              terbaru dari email Anda, atau{" "}
              <Link href="/login" className="text-indigo-600 font-semibold hover:underline">minta ulang dari halaman login</Link>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-gray-500">Masukkan kata sandi baru untuk akun Anda.</p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kata Sandi Baru</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none text-black text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Konfirmasi Kata Sandi</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none text-black text-sm"
              />
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:opacity-60 transition-all"
            >
              {loading ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
