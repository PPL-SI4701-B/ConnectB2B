import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-indigo-50 to-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 font-bold">
          ConnectB2B
        </p>
      </div>

      <div className="text-center mt-24">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
          Penghubung UMKM & <span className="text-indigo-600">Industri</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Platform digital yang memfasilitasi kolaborasi strategis antara UMKM lokal dan sektor industri menengah hingga besar.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/login" 
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Mulai Sekarang
          </Link>
          <Link 
            href="/register" 
            className="px-8 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Daftar Bisnis
          </Link>
        </div>
      </div>
    </main>
  );
}
