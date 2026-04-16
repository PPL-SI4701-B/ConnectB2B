"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  Store,
  Factory,
  ShieldAlert,
  ChevronRight,
  ArrowLeft,
  CirclePlus,
} from "lucide-react";

type Role = "UMKM" | "Industri" | "Admin";

export default function LoginPage() {
  const [step, setStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleRoleSelection = (role: Role) => {
    setSelectedRole(role);
    setStep("form");
    setErrorMsg("");
  };

  const getRoleColor = (role: Role | null) => {
    switch (role) {
      case "UMKM":
        return "text-indigo-600";
      case "Industri":
        return "text-cyan-500";
      case "Admin":
        return "text-red-500";
      default:
        return "text-indigo-600";
    }
  };

  const getRoleButtonColor = (role: Role | null) => {
    switch (role) {
      case "UMKM":
        return "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 text-white";
      case "Industri":
        return "bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/30 text-white";
      case "Admin":
        return "bg-red-500 hover:bg-red-600 shadow-red-500/30 text-white";
      default:
        return "bg-indigo-600 hover:bg-indigo-700 text-white";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Fetch role from users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (userError) {
          setErrorMsg("Gagal mengambil data profil pengguna.");
          setIsLoading(false);
          return;
        }

        // Verify if the login role matches the database role?
        // Let's redirect them based on their actual role in DB
        const userRole = userData?.role?.toLowerCase();

        if (userRole === "umkm") {
          router.push("/dashboard");
        } else if (userRole === "industri") {
          router.push("/dashboard-industri");
        } else if (userRole === "admin") {
          router.push("/admin");
        } else {
          setErrorMsg("Role pengguna tidak terdaftar.");
        }
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan pada server.");
    } finally {
      if (!errorMsg) setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side: Auth forms */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          {/* Logo Branding */}
          <div
            className="flex items-center gap-2 mb-10 cursor-pointer"
            onClick={() => setStep("role")}
          >
            <CirclePlus className="w-8 h-8 text-indigo-600 fill-indigo-600 text-white" />
            <span className="text-2xl font-bold text-gray-900">
              Connect<span className="text-indigo-600">B2B</span>
            </span>
          </div>

          {step === "role" ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Selamat Datang 👋
              </h2>
              <p className="text-gray-500 mb-8">
                Pilih peran Anda untuk masuk ke dalam ekosistem rantai pasok
                ConnectB2B.
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSelection("UMKM")}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all font-medium"
                >
                  <div className="flex items-center gap-3">
                    <Store className="w-6 h-6" />
                    <span>Masuk sebagai UMKM</span>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleRoleSelection("Industri")}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 transition-all font-medium"
                >
                  <div className="flex items-center gap-3">
                    <Factory className="w-6 h-6" />
                    <span>Masuk sebagai Industri</span>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleRoleSelection("Admin")}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all font-medium"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6" />
                    <span>Masuk sebagai Admin</span>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <p className="text-center mt-10 text-sm text-gray-600 font-semibold">
                Belum punya akun?{" "}
                <Link
                  href="/register"
                  className="text-indigo-600 hover:underline"
                >
                  Daftar Sekarang
                </Link>
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
                onClick={() => setStep("role")}
                className="flex items-center gap-2 text-sm text-gray-500 font-semibold mb-6 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali Pilih Peran
              </button>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Login <span className={getRoleColor(selectedRole)}>{selectedRole}</span>
              </h2>
              <p className="text-gray-500 mb-8">
                Masukkan email dan kata sandi Anda yang terdaftar.
              </p>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <div className="w-1/2 py-2 text-center border-b-2 border-indigo-600 text-indigo-600 font-semibold cursor-pointer">
                  Masuk
                </div>
                <Link
                  href="/register"
                  className="w-1/2 py-2 text-center text-gray-500 hover:text-gray-900 font-semibold transition-colors"
                >
                  Daftar Akun Baru
                </Link>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                    placeholder="nama@perusahaan.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                    placeholder="Minimal 8 karakter"
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    Ingat Saya
                  </label>
                  <Link
                    href="#"
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Lupa Sandi?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg font-semibold shadow-lg transition-all ${getRoleButtonColor(
                    selectedRole
                  )} ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isLoading ? "Mengautentikasi..." : "Lanjutkan Masuk"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Hero background */}
      <div className="hidden lg:block lg:w-1/2 relative bg-indigo-900 overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1586528116311-ad8ed7c66363?auto=format&fit=crop&q=80&w=1200')",
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-indigo-700/90 to-cyan-500/90" />

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-12 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Hubungkan Bisnis Anda
          </h1>
          <p className="text-lg text-indigo-100 max-w-md">
            Platform digital terintegrasi untuk menyatukan UMKM dan Industri
            dalam satu ekosistem rantai pasok lokal yang solid. Didesain secara
            fungsional berdasarkan Point-of-View.
          </p>
        </div>
      </div>
    </div>
  );
}
