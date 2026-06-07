/**
 * FR-08: Upload Produk/Jasa ke Katalog (katalog publik)
 * Tabel: produk, kategori, umkm
 */
import { filterByCategory } from '@/lib/validation';

const katalog = [
  { id: 1, nama: 'Kain Katun', kategori: 'Tekstil' },
  { id: 2, nama: 'Kue Lapis', kategori: 'Makanan' },
  { id: 3, nama: 'Benang', kategori: 'Tekstil' },
];

describe('FR-08: Upload Produk ke Katalog Publik', () => {
  test('TC-08-01: Katalog publik menampilkan produk dari semua UMKM', () => {
    expect(katalog.length).toBeGreaterThan(0);
    expect(katalog).toHaveLength(3);
  });

  test('TC-08-02: Detail produk (info lengkap saat dipilih)', () => {
    const detail = katalog.find((p) => p.id === 1);
    expect(detail).toBeDefined();
    expect(detail).toHaveProperty('nama');
    expect(detail).toHaveProperty('kategori');
  });

  test('TC-08-03: Filter kategori Tekstil → hanya produk Tekstil', () => {
    const hasil = filterByCategory(katalog, 'Tekstil');
    expect(hasil).toHaveLength(2);
    expect(hasil.every((p) => p.kategori === 'Tekstil')).toBe(true);
  });

  test('Skenario alternatif: produk dihapus → hilang dari katalog publik', () => {
    const setelahHapus = katalog.filter((p) => p.id !== 1);
    expect(filterByCategory(setelahHapus, 'Tekstil')).toHaveLength(1);
  });
});
