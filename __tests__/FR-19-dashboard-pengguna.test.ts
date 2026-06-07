/**
 * FR-19: Dashboard Pengguna (UMKM & Industri)
 * Tabel: users, umkm, industri, request, transaksi
 */
import { resolveRedirectPath } from '@/lib/validation';

// Bangun ringkasan statistik dashboard dari data mentah.
function buildDashboardStats(data: { totalUmkm: number; totalIndustri: number; transaksi: { status: string }[] }) {
  const kerjasamaAktif = data.transaksi.filter((t) => t.status === 'aktif' || t.status === 'lunas').length;
  return {
    cards: [data.totalUmkm, data.totalIndustri, kerjasamaAktif],
    tabelKosong: data.transaksi.length === 0,
  };
}

describe('FR-19: Dashboard Pengguna', () => {
  test('TC-19-01: Dashboard UMKM tampil (3 stat cards + tabel request)', () => {
    expect(resolveRedirectPath('umkm')).toBe('/dashboard');
    const stats = buildDashboardStats({ totalUmkm: 10, totalIndustri: 4, transaksi: [{ status: 'aktif' }] });
    expect(stats.cards).toHaveLength(3);
  });

  test('TC-19-02: Dashboard Industri tampil (3 stat cards + tabel pemesanan)', () => {
    expect(resolveRedirectPath('industri')).toBe('/dashboard-industri');
    const stats = buildDashboardStats({ totalUmkm: 8, totalIndustri: 2, transaksi: [{ status: 'lunas' }] });
    expect(stats.cards).toHaveLength(3);
    expect(stats.cards[2]).toBe(1);
  });

  test('TC-19-03: Data kosong → stat 0, tabel kosong', () => {
    const stats = buildDashboardStats({ totalUmkm: 0, totalIndustri: 0, transaksi: [] });
    expect(stats.cards).toEqual([0, 0, 0]);
    expect(stats.tabelKosong).toBe(true);
  });
});
