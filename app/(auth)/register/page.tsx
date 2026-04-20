"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Factory,
  ChevronRight,
  ArrowLeft,
  CirclePlus,
} from "lucide-react";

type Role = "UMKM" | "Industri";

export default function RegisterPage() {
  const router = useRouter();

  const handleRoleSelection = (role: Role) => {
    if (role === "UMKM") {
      router.push("/register/umkm");
    } else {
      router.push("/register/industri");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side: Role Selection */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          {/* Logo Branding */}
          <Link
            href="/login"
            className="flex items-center gap-2 mb-10 cursor-pointer w-fit"
          >
            <CirclePlus className="w-8 h-8 text-indigo-600 fill-indigo-600 text-white" />
            <span className="text-2xl font-bold text-gray-900">
              Connect<span className="text-indigo-600">B2B</span>
            </span>
          </Link>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-sm text-gray-500 font-semibold mb-6 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Daftar Akun Baru 🚀
            </h2>
            <p className="text-gray-500 mb-8">
              Pilih tipe akun yang sesuai dengan profil bisnis Anda untuk bergabung dalam ekosistem ConnectB2B.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelection("UMKM")}
                className="w-full flex items-center justify-between p-5 rounded-xl bg-white border-2 border-transparent hover:border-indigo-600 shadow-sm hover:shadow-indigo-100 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Daftar sebagai UMKM</h3>
                    <p className="text-sm text-gray-500">Penyedia produk atau jasa skala menengah & kecil</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => handleRoleSelection("Industri")}
                className="w-full flex items-center justify-between p-5 rounded-xl bg-white border-2 border-transparent hover:border-cyan-500 shadow-sm hover:shadow-cyan-100 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    <Factory className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Daftar sebagai Industri</h3>
                    <p className="text-sm text-gray-500">Perusahaan besar penyerap pasokan UMKM</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            <p className="text-center mt-10 text-sm text-gray-600 font-semibold">
              Sudah memiliki akun?{" "}
              <Link
                href="/login"
                className="text-indigo-600 hover:underline"
              >
                Masuk Sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Hero background */}
      <div className="hidden lg:block lg:w-1/2 relative bg-indigo-900 overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200')",
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-indigo-700/90 to-blue-600/90" />

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-12 text-center text-white">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Ekosistem Terpercaya
          </h1>
          <p className="text-lg text-indigo-100 max-w-md">
            Membangun kolaborasi yang saling menguntungkan antara pelaku usaha lokal dan pemain industri global.
          </p>
        </div>
      </div>
    </div>
  );
}
