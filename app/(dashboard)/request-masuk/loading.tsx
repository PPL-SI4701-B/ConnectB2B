function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function RequestMasukLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Sk className="h-4 w-40" />
          <Sk className="h-9 w-52" />
        </div>
        <Sk className="h-10 w-10 rounded-full" />
      </header>

      {/* Request cards */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Sk className="w-12 h-12 rounded-full shrink-0" />
              <div className="space-y-2">
                <Sk className="h-5 w-44" />
                <Sk className="h-4 w-32" />
              </div>
            </div>
            <Sk className="h-7 w-20 rounded-full" />
          </div>
          <Sk className="h-4 w-full" />
          <Sk className="h-4 w-3/4" />
          <div className="flex gap-3 pt-2">
            <Sk className="h-10 flex-1 rounded-xl" />
            <Sk className="h-10 flex-1 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
