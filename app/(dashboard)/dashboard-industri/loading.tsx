function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function DashboardIndustriLoading() {
  return (
    <div className="w-full bg-gray-50 min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <Sk className="h-4 w-40" />
          <Sk className="h-8 w-64" />
        </div>
        <Sk className="h-12 w-44 rounded-full" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <Sk className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk className="h-3.5 w-24" />
                <Sk className="h-6 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main table area */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between mb-5">
            <Sk className="h-6 w-48" />
            <Sk className="h-9 w-24 rounded-lg" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50">
                <Sk className="w-9 h-9 rounded-lg shrink-0" />
                <Sk className="h-4 flex-1" />
                <Sk className="h-4 w-20" />
                <Sk className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <Sk className="h-6 w-36" />
          <Sk className="h-12 w-full rounded-xl" />
          <Sk className="h-12 w-full rounded-xl" />
          <div className="pt-4 border-t border-gray-100 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Sk className="w-8 h-8 rounded-lg shrink-0" />
                <Sk className="h-4 flex-1" />
                <Sk className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
