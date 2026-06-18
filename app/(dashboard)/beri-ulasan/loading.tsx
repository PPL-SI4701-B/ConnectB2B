function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function BeriUlasanLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Sk className="h-4 w-36" />
          <Sk className="h-9 w-48" />
        </div>
        <Sk className="h-10 w-10 rounded-full" />
      </header>

      {/* Ulasan form cards */}
      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-4">
            <Sk className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-2">
              <Sk className="h-5 w-40" />
              <Sk className="h-4 w-28" />
            </div>
          </div>
          {/* Star rating */}
          <div className="flex gap-2">
            {[...Array(5)].map((_, j) => (
              <Sk key={j} className="w-8 h-8 rounded-full" />
            ))}
          </div>
          <Sk className="h-28 w-full rounded-xl" />
          <Sk className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
