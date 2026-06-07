/**
 * FR-10: Pencarian Berdasarkan Kategori (algoritma clustering)
 * Tabel: umkm, produk, kategori, profiles
 */
import { searchAndClusterUmkm } from '@/lib/searchAlgorithm';

const mockData: any[] = [
  {
    id: 1, user_id: 'u1', nama_usaha: 'Maju Jaya Tekstil', alamat: 'Jl. Merdeka, Bandung',
    kategori: 'Tekstil', kontak: '0812', nama_user: 'Budi', status_verifikasi: 'terverifikasi',
    produk: [{ id: 1, nama: 'Kain Katun', harga: 50000 }], equipment: [], totalProduk: 1,
  },
  {
    id: 2, user_id: 'u2', nama_usaha: 'Warung Bu Ani', alamat: 'Jl. Sudirman, Jakarta',
    kategori: 'Makanan', kontak: '0819', nama_user: 'Ani', status_verifikasi: 'terverifikasi',
    produk: [{ id: 2, nama: 'Kue Lapis', harga: 20000 }], equipment: [], totalProduk: 1,
  },
  {
    id: 3, user_id: 'u3', nama_usaha: 'Berkah Mesin', alamat: 'Kawasan Industri, Bekasi',
    kategori: 'Alat Produksi', kontak: '0855', nama_user: 'Cipto', status_verifikasi: 'terverifikasi',
    produk: [], equipment: [{ id: 1, nama: 'Mesin Jahit Industri', harga_sewa: 100000 }], totalProduk: 1,
  },
];

describe('FR-10: Pencarian Berdasarkan Kategori', () => {
  test('TC-10-01: Pencarian keyword "Tekstil" → UMKM kategori Tekstil muncul', () => {
    const result = searchAndClusterUmkm(mockData, { keyword: 'Tekstil' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].nama_usaha).toBe('Maju Jaya Tekstil');
  });

  test('TC-10-02: Pencarian kosong (keyword tidak ada) → tidak ditemukan', () => {
    const result = searchAndClusterUmkm(mockData, { keyword: 'KeywordNgawur123' });
    expect(result).toHaveLength(0);
  });

  test('TC-10-03: Pencarian dengan kategori "Makanan" → hanya UMKM Makanan', () => {
    const result = searchAndClusterUmkm(mockData, { kategoriList: ['Makanan'] });
    expect(result).toHaveLength(1);
    expect(result[0].nama_usaha).toBe('Warung Bu Ani');
  });

  test('Clustering/ranking berdasarkan relevansi (skor tertinggi di atas)', () => {
    const result = searchAndClusterUmkm(mockData, { keyword: 'Mesin' });
    expect(result[0].nama_usaha).toBe('Berkah Mesin');
  });
});
