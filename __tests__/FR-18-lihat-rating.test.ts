/**
 * FR-18: Lihat Rating & Review
 * Tabel: ulasan, umkm, transaksi
 */
import { computeAverageRating } from '@/lib/validation';

describe('FR-18: Lihat Rating & Review', () => {
  test('TC-18-01: Tampil rata-rata rating (UMKM dengan 3 ulasan)', () => {
    const ulasan = [{ rating: 5 }, { rating: 4 }, { rating: 3 }];
    const { avg, count } = computeAverageRating(ulasan);
    expect(count).toBe(3);
    expect(avg).toBeCloseTo(4.0, 5);
  });

  test('TC-18-02: Belum ada ulasan → avg 0, count 0 (pesan belum ada ulasan)', () => {
    const { avg, count } = computeAverageRating([]);
    expect(count).toBe(0);
    expect(avg).toBe(0);
  });
});
