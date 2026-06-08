function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function ProfilLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Sk className="h-4 w-36" />
          <Sk className="h-9 w-44" />
        </div>
        <Sk className="h-10 w-10 rounded-full" />
      </header>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-6 mb-8">
          <Sk className="w-20 h-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Sk className="h-6 w-48" />
            <Sk className="h-4 w-32" />
            <Sk className="h-5 w-20 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Sk className="h-4 w-24" />
              <Sk className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Sk className="h-4 w-24 mb-2" />
          <Sk className="h-24 w-full rounded-xl" />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Sk className="h-11 w-28 rounded-xl" />
          <Sk className="h-11 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
