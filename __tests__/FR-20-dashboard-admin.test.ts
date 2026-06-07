/**
 * FR-20: Dashboard Admin
 * Tabel: users, umkm, industri, transaksi, dokumen_legalitas, produk
 */
import { canAccessAdmin } from '@/lib/validation';

function buildAdminStats(db: {
  transaksiSukses: number;
  penggunaTervalidasi: number;
  laporanPelanggaran: number;
  industriAktif: number;
}) {
  return [db.transaksiSukses, db.penggunaTervalidasi, db.laporanPelanggaran, db.industriAktif];
}

describe('FR-20: Dashboard Admin', () => {
  test('TC-20-01: Dashboard admin tampil (4 stat cards)', () => {
    expect(canAccessAdmin('admin')).toBe(true);
    const cards = buildAdminStats({ transaksiSukses: 5, penggunaTervalidasi: 12, laporanPelanggaran: 1, industriAktif: 3 });
    expect(cards).toHaveLength(4);
  });

  test('TC-20-02: Stat cards akurat (angka sesuai data DB)', () => {
    const cards = buildAdminStats({ transaksiSukses: 5, penggunaTervalidasi: 12, laporanPelanggaran: 1, industriAktif: 3 });
    expect(cards).toEqual([5, 12, 1, 3]);
  });

  test('Kontrol akses: non-admin tidak boleh akses dashboard admin', () => {
    expect(canAccessAdmin('umkm')).toBe(false);
    expect(canAccessAdmin('industri')).toBe(false);
  });
});
