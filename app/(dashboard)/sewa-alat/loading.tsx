function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function SewaAlatLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 py-2">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <Sk className="h-4 w-36" />
          <Sk className="h-9 w-72" />
        </div>
        <Sk className="h-10 w-10 rounded-full" />
      </header>

      {/* Search + filter */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex gap-4">
          <Sk className="h-12 flex-1 rounded-xl" />
          <Sk className="h-12 w-36 rounded-xl" />
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <Sk className="w-full h-44 rounded-none rounded-t-2xl" />
            <div className="p-4 space-y-2">
              <Sk className="h-5 w-3/4" />
              <Sk className="h-4 w-1/2" />
              <div className="flex justify-between items-center pt-2">
                <Sk className="h-5 w-24" />
                <Sk className="h-9 w-28 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
