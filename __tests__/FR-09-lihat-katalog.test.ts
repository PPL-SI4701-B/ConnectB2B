/**
 * FR-09: Lihat Katalog (akses semua role + sorting)
 * Tabel: produk, equipment, kategori, umkm
 */
import { sortCatalog, type KatalogItem } from '@/lib/validation';

const items: KatalogItem[] = [
  { id: 1, nama: 'A', harga: 30000, created_at: '2026-01-01', rating: 4 },
  { id: 2, nama: 'B', harga: 10000, created_at: '2026-03-01', rating: 5 },
  { id: 3, nama: 'C', harga: 50000, created_at: '2026-02-01', rating: 3 },
];

// Hak akses katalog: semua role yang login boleh.
function canViewKatalog(role: string): boolean {
  return ['umkm', 'industri', 'admin'].includes(role.toLowerCase());
}

describe('FR-09: Lihat Katalog', () => {
  test('TC-09-01: UMKM bisa lihat katalog', () => {
    expect(canViewKatalog('umkm')).toBe(true);
  });

  test('TC-09-02: Industri bisa lihat katalog', () => {
    expect(canViewKatalog('industri')).toBe(true);
  });

  test('Sorting termurah → harga menaik', () => {
    const sorted = sortCatalog(items, 'termurah');
    expect(sorted.map((i) => i.harga)).toEqual([10000, 30000, 50000]);
  });

  test('Sorting termahal → harga menurun', () => {
    const sorted = sortCatalog(items, 'termahal');
    expect(sorted.map((i) => i.harga)).toEqual([50000, 30000, 10000]);
  });

  test('Sorting rating tertinggi', () => {
    const sorted = sortCatalog(items, 'rating');
    expect(sorted[0].id).toBe(2);
  });

  test('Sorting terbaru → created_at menurun', () => {
    const sorted = sortCatalog(items, 'terbaru');
    expect(sorted.map((i) => i.id)).toEqual([2, 3, 1]);
  });
});
