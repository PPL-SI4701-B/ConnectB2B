function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function PencarianLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 text-black">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <Sk className="h-4 w-36" />
          <Sk className="h-9 w-64" />
        </div>
        <Sk className="h-10 w-10 rounded-full" />
      </header>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex gap-4">
          <Sk className="h-12 flex-1 rounded-xl" />
          <Sk className="h-12 w-36 rounded-xl" />
        </div>
        <Sk className="h-4 w-36 mt-4" />
      </div>

      {/* UMKM Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex gap-4">
              <Sk className="w-14 h-14 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk className="h-5 w-3/4" />
                <div className="flex gap-2">
                  <Sk className="h-4 w-20 rounded-full" />
                  <Sk className="h-4 w-16" />
                </div>
                <Sk className="h-3.5 w-1/2" />
                <div className="flex gap-2 mt-2">
                  <Sk className="h-6 w-20 rounded-lg" />
                  <Sk className="h-6 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
