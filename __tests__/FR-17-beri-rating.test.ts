/**
 * FR-17: Memberi Rating & Review
 * Tabel: ulasan, transaksi
 */
import { validateReview, canEditReview, REVIEW_EDIT_WINDOW_MS } from '@/lib/validation';

describe('FR-17: Memberi Rating & Review', () => {
  test('TC-17-01: Submit review berhasil (rating 5 + komentar)', () => {
    const res = validateReview({ rating: 5, komentar: 'Sangat bagus' });
    expect(res.valid).toBe(true);
  });

  test('TC-17-02: Rating tanpa komentar → tetap berhasil (komentar opsional)', () => {
    const res = validateReview({ rating: 4, komentar: '' });
    expect(res.valid).toBe(true);
  });

  test('TC-17-03: Rating tanpa bintang → validasi error', () => {
    const res = validateReview({ rating: 0, komentar: 'Ada komentar tapi tanpa bintang' });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/bintang/i);
  });

  test('Skenario alternatif: edit ulasan dalam 24 jam diizinkan, lewat 24 jam ditolak', () => {
    const now = Date.now();
    expect(canEditReview(new Date(now - 1000).toISOString(), now)).toBe(true);
    expect(canEditReview(new Date(now - REVIEW_EDIT_WINDOW_MS - 1000).toISOString(), now)).toBe(false);
  });
});
