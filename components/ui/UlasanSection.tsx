'use client';

import { useState } from 'react';
import { Star, MessageSquare, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import type { Ulasan } from '@/types/umkm';

const REVIEWS_PER_PAGE = 5;

interface UlasanSectionProps {
  ulasan: Ulasan[];
  rating_avg: number;
  rating_count: number;
  umkm_nama: string;
}

/** Render filled / half / empty stars based on a float rating */
function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill =
          rating >= star
            ? '#f59e0b'
            : rating >= star - 0.5
            ? 'url(#halfGrad)'
            : '#e5e7eb';

        return (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fill}
            stroke={rating >= star - 0.5 ? '#f59e0b' : '#e5e7eb'}
            strokeWidth="1.5"
            className="shrink-0"
          >
            <defs>
              <linearGradient id="halfGrad">
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#e5e7eb" />
              </linearGradient>
            </defs>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
    </div>
  );
}

function formatTanggal(tanggal: string): string {
  try {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return tanggal;
  }
}

export default function UlasanSection({
  ulasan,
  rating_avg,
  rating_count,
  umkm_nama,
}: UlasanSectionProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(ulasan.length / REVIEWS_PER_PAGE));
  const paginatedUlasan = ulasan.slice(
    (page - 1) * REVIEWS_PER_PAGE,
    page * REVIEWS_PER_PAGE
  );

  // Distribution of stars 1–5
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ulasan.filter((u) => Math.round(u.rating) === star).length,
  }));

  if (ulasan.length === 0) {
    return (
      <div
        id="ulasan-empty-state"
        data-testid="ulasan-empty-state"
        className="flex flex-col items-center justify-center py-14 text-center px-4"
      >
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 border border-amber-100">
          <MessageSquare className="w-7 h-7 text-amber-300" />
        </div>
        <h4 className="text-base font-bold text-gray-700 mb-1">Belum ada ulasan</h4>
        <p className="text-sm text-gray-400 max-w-xs">
          Belum ada ulasan untuk UMKM ini.
        </p>
      </div>
    );
  }

  return (
    <div id="ulasan-section" data-testid="ulasan-section" className="space-y-6">
      {/* ── Rating Summary ── */}
      <div
        id="rating-summary"
        data-testid="rating-summary"
        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100"
      >
        <div className="flex items-center gap-5">
          {/* Big average score */}
          <div className="flex flex-col items-center shrink-0">
            <span
              id="rating-avg-value"
              data-testid="rating-avg-value"
              className="text-5xl font-black text-amber-500 leading-none"
            >
              {rating_avg.toFixed(1)}
            </span>
            <StarDisplay rating={rating_avg} size={18} />
            <span
              id="rating-count-label"
              data-testid="rating-count-label"
              className="text-xs text-gray-500 mt-1"
            >
              {rating_count} ulasan
            </span>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 space-y-1.5">
            {distribution.map(({ star, count }) => {
              const pct = rating_count > 0 ? (count / rating_count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4 shrink-0 text-right">
                    {star}
                  </span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-5 shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Review List ── */}
      <div className="space-y-3" id="ulasan-list" data-testid="ulasan-list">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Ulasan Terbaru
        </h4>

        {paginatedUlasan.map((u) => (
          <div
            key={u.id}
            id={`ulasan-item-${u.id}`}
            data-testid="ulasan-item"
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-amber-200 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Reviewer avatar */}
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                <Building2 className="w-4 h-4 text-indigo-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900 truncate">
                    {u.industri_nama}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatTanggal(u.tanggal)}
                  </span>
                </div>

                <div className="mt-1 mb-2">
                  <StarDisplay rating={u.rating} size={14} />
                </div>

                {u.komentar ? (
                  <p className="text-sm text-gray-600 leading-relaxed">{u.komentar}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Tidak ada komentar tertulis.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div
          id="ulasan-pagination"
          data-testid="ulasan-pagination"
          className="flex items-center justify-between pt-2"
        >
          <button
            id="ulasan-prev-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </button>

          <span className="text-xs text-gray-500">
            Halaman {page} dari {totalPages}
          </span>

          <button
            id="ulasan-next-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Berikutnya
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
