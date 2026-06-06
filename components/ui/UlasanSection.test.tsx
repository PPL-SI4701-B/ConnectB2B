/**
 * Unit Tests — FR-18: Section Ulasan di Profil UMKM
 *
 * TC-18-01: UMKM dengan 3 ulasan → rata-rata bintang + jumlah ulasan tampil
 * TC-18-02: UMKM baru (0 ulasan) → pesan 'Belum ada ulasan untuk UMKM ini'
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UlasanSection from './UlasanSection';
import type { Ulasan } from '@/types/umkm';

// ─── Mock data ────────────────────────────────────────────────────────────────

const makeUlasan = (overrides: Partial<Ulasan> = {}, index = 1): Ulasan => ({
  id: index,
  rating: 4,
  komentar: `Komentar ulasan ${index}`,
  tanggal: '2025-01-15T00:00:00.000Z',
  industri_nama: `PT Industri ${index}`,
  ...overrides,
});

const ulasan3: Ulasan[] = [
  makeUlasan({ rating: 5, komentar: 'Sangat puas dengan kualitas produk!' }, 1),
  makeUlasan({ rating: 4, komentar: 'Pengiriman tepat waktu.' }, 2),
  makeUlasan({ rating: 3, komentar: 'Cukup baik, bisa ditingkatkan.' }, 3),
];

// avg = (5+4+3) / 3 = 4.0
const avgOf3 = 4.0;
const countOf3 = 3;

// ─── TC-18-01: UMKM dengan 3 ulasan ──────────────────────────────────────────

describe('TC-18-01: UMKM dengan ulasan', () => {
  beforeEach(() => {
    render(
      <UlasanSection
        ulasan={ulasan3}
        rating_avg={avgOf3}
        rating_count={countOf3}
        umkm_nama="UMKM Test"
      />
    );
  });

  it('menampilkan section ulasan (bukan empty state)', () => {
    expect(screen.getByTestId('ulasan-section')).toBeInTheDocument();
    expect(screen.queryByTestId('ulasan-empty-state')).not.toBeInTheDocument();
  });

  it('menampilkan rata-rata rating dengan benar', () => {
    const avgEl = screen.getByTestId('rating-avg-value');
    expect(avgEl).toBeInTheDocument();
    expect(avgEl.textContent).toBe('4.0');
  });

  it('menampilkan jumlah ulasan yang benar', () => {
    const countEl = screen.getByTestId('rating-count-label');
    expect(countEl.textContent).toContain('3');
    expect(countEl.textContent).toContain('ulasan');
  });

  it('menampilkan daftar ulasan', () => {
    const items = screen.getAllByTestId('ulasan-item');
    expect(items.length).toBe(3);
  });

  it('menampilkan nama industri reviewer', () => {
    expect(screen.getByText('PT Industri 1')).toBeInTheDocument();
    expect(screen.getByText('PT Industri 2')).toBeInTheDocument();
    expect(screen.getByText('PT Industri 3')).toBeInTheDocument();
  });

  it('menampilkan komentar ulasan', () => {
    expect(screen.getByText('Sangat puas dengan kualitas produk!')).toBeInTheDocument();
    expect(screen.getByText('Pengiriman tepat waktu.')).toBeInTheDocument();
  });

  it('tidak menampilkan pagination jika ulasan <= 5', () => {
    expect(screen.queryByTestId('ulasan-pagination')).not.toBeInTheDocument();
  });
});

// ─── TC-18-02: UMKM baru tanpa ulasan ────────────────────────────────────────

describe('TC-18-02: UMKM belum ada ulasan', () => {
  beforeEach(() => {
    render(
      <UlasanSection
        ulasan={[]}
        rating_avg={0}
        rating_count={0}
        umkm_nama="UMKM Baru"
      />
    );
  });

  it('menampilkan empty state (bukan section ulasan)', () => {
    expect(screen.getByTestId('ulasan-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('ulasan-section')).not.toBeInTheDocument();
  });

  it("menampilkan pesan 'Belum ada ulasan untuk UMKM ini'", () => {
    expect(
      screen.getByText(/belum ada ulasan untuk umkm ini/i)
    ).toBeInTheDocument();
  });

  it('tidak menampilkan rating summary', () => {
    expect(screen.queryByTestId('rating-summary')).not.toBeInTheDocument();
  });

  it('tidak menampilkan list ulasan', () => {
    expect(screen.queryByTestId('ulasan-list')).not.toBeInTheDocument();
  });
});

// ─── Pagination test ─────────────────────────────────────────────────────────

describe('Pagination: lebih dari 5 ulasan', () => {
  const ulasan6: Ulasan[] = Array.from({ length: 6 }, (_, i) =>
    makeUlasan({ komentar: `Komentar ${i + 1}` }, i + 1)
  );

  beforeEach(() => {
    render(
      <UlasanSection
        ulasan={ulasan6}
        rating_avg={4}
        rating_count={6}
        umkm_nama="UMKM Banyak Ulasan"
      />
    );
  });

  it('menampilkan pagination jika lebih dari 5 ulasan', () => {
    expect(screen.getByTestId('ulasan-pagination')).toBeInTheDocument();
  });

  it('hanya menampilkan 5 item di halaman pertama', () => {
    const items = screen.getAllByTestId('ulasan-item');
    expect(items.length).toBe(5);
  });

  it('menavigasi ke halaman berikutnya saat klik Berikutnya', async () => {
    const user = userEvent.setup();
    const nextBtn = screen.getByText(/berikutnya/i);
    await user.click(nextBtn);

    const items = screen.getAllByTestId('ulasan-item');
    expect(items.length).toBe(1); // 6 ulasan total, halaman 2 = 1 item
  });
});
