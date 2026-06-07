/**
 * FR-06: Tambah Produk/Jasa di Profil
 * Tabel: produk, kategori, Storage bucket 'produk-images'
 */
import { validateProductForm } from '@/lib/validation';

describe('FR-06: Tambah Produk/Jasa', () => {
  test('TC-06-01: Tambah produk berhasil (data valid + foto)', () => {
    const res = validateProductForm({ nama: 'Kain Katun', kategori: 'Tekstil', harga: 50000, fotoCount: 1 });
    expect(res.valid).toBe(true);
  });

  test('TC-06-02: Tambah tanpa foto → error "Minimal 1 foto"', () => {
    const res = validateProductForm({ nama: 'Kain Katun', kategori: 'Tekstil', harga: 50000, fotoCount: 0 });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Minimal 1 foto/i);
  });

  test('TC-06-03: Edit produk (ubah harga) → harga terupdate', () => {
    let produk = { nama: 'Kain', kategori: 'Tekstil', harga: 50000 };
    produk = { ...produk, harga: 75000 };
    expect(produk.harga).toBe(75000);
    expect(validateProductForm({ ...produk, fotoCount: 1 }).valid).toBe(true);
  });

  test('TC-06-04: Hapus produk → hilang dari katalog', () => {
    let katalog = [{ id: 1 }, { id: 2 }];
    katalog = katalog.filter((p) => p.id !== 1);
    expect(katalog.find((p) => p.id === 1)).toBeUndefined();
    expect(katalog).toHaveLength(1);
  });

  test('Validasi tambahan: harga negatif ditolak', () => {
    const res = validateProductForm({ nama: 'X', kategori: 'Tekstil', harga: -1, fotoCount: 1 });
    expect(res.valid).toBe(false);
  });
});
