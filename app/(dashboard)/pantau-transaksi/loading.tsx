function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function PantauTransaksiLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Sk className="h-4 w-40" />
          <Sk className="h-9 w-56" />
        </div>
        <Sk className="h-10 w-10 rounded-full" />
      </header>

      {/* Transaksi Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        {/* Status Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Sk className="h-5 w-40" />
            <Sk className="h-4 w-32" />
          </div>
          <Sk className="h-7 w-24 rounded-full" />
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 py-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <Sk className="w-8 h-8 rounded-full shrink-0" />
              {i < 4 && <Sk className="h-1 flex-1" />}
            </div>
          ))}
        </div>

        {/* Info boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <Sk className="h-5 w-32" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Sk className="h-4 w-24" />
                <Sk className="h-4 w-32" />
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <Sk className="h-5 w-32" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Sk className="h-4 w-24" />
                <Sk className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-4 space-y-3">
          <Sk className="h-12 w-full rounded-xl" />
          <Sk className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
