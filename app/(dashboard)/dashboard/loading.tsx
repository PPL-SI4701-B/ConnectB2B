// Skeleton shimmer reusable
function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="p-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <Sk className="h-4 w-36" />
            <Sk className="h-8 w-52" />
          </div>
          <Sk className="h-12 w-44 rounded-full" />
        </div>

        {/* 3 Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-5">
              <Sk className="w-14 h-14 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk className="h-4 w-32" />
                <Sk className="h-7 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <Sk className="h-6 w-72" />
            <Sk className="h-10 w-28 rounded-lg" />
          </div>
          <div className="space-y-4">
            {/* Table header */}
            <div className="grid grid-cols-6 gap-4 pb-4 border-b border-gray-100">
              {[...Array(6)].map((_, i) => (
                <Sk key={i} className="h-4 w-full" />
              ))}
            </div>
            {/* Table rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 py-4 border-b border-gray-50">
                {[...Array(6)].map((_, j) => (
                  <Sk key={j} className="h-5 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
