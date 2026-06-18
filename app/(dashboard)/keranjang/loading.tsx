function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function KeranjangLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Sk className="h-4 w-36" />
          <Sk className="h-9 w-56" />
        </div>
        <Sk className="h-10 w-10 rounded-full" />
      </header>

      {/* Cart Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Sk className="h-6 w-40" />
          <Sk className="h-8 w-24 rounded-lg" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100">
            <Sk className="w-16 h-16 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Sk className="h-5 w-48" />
              <Sk className="h-4 w-28" />
            </div>
            <div className="flex items-center gap-3">
              <Sk className="h-8 w-24 rounded-lg" />
              <Sk className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Specification form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <Sk className="h-6 w-48" />
        <Sk className="h-11 w-full rounded-xl" />
        <Sk className="h-24 w-full rounded-xl" />
      </div>

      {/* Summary & checkout */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
        <Sk className="h-5 w-36" />
        <div className="flex justify-between">
          <Sk className="h-4 w-24" />
          <Sk className="h-4 w-20" />
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <Sk className="h-5 w-20" />
          <Sk className="h-5 w-28" />
        </div>
        <Sk className="h-12 w-full mt-4 rounded-xl" />
      </div>
    </div>
  );
}
