// @ts-nocheck
import { expect, test, describe } from 'bun:test';
import { searchAndClusterUmkm } from './searchAlgorithm';
import { UmkmItem } from '@/types/umkm';

const mockData: UmkmItem[] = [
  {
    id: 1,
    user_id: 'u1',
    nama_usaha: 'Maju Jaya Tekstil',
    alamat: 'Jl. Merdeka No. 1',
    kategori: 'Tekstil',
    kontak: '081234567890',
    nama_user: 'Budi',
    produk: [
      { id: 1, nama: 'Kain Katun', harga: 50000 }
    ],
    equipment: [],
    totalProduk: 1
  },
  {
    id: 2,
    user_id: 'u2',
    nama_usaha: 'Warung Bu Ani',
    alamat: 'Jl. Sudirman No. 5',
    kategori: 'Makanan',
    kontak: '081987654321',
    nama_user: 'Ani',
    produk: [
      { id: 2, nama: 'Kue Lapis', harga: 20000 },
      { id: 3, nama: 'Keripik Tempe', harga: 15000 }
    ],
    equipment: [],
    totalProduk: 2
  },
  {
    id: 3,
    user_id: 'u3',
    nama_usaha: 'Berkah Mesin',
    alamat: 'Kawasan Industri',
    kategori: 'Alat Produksi',
    kontak: '085555555555',
    nama_user: 'Cipto',
    produk: [],
    equipment: [
      { id: 1, nama: 'Mesin Jahit Industri', harga_sewa: 100000 }
    ],
    totalProduk: 1
  }
];

describe('searchAndClusterUmkm', () => {
  test('TC-10-01: Pencarian keyword "Tekstil"', () => {
    const result = searchAndClusterUmkm(mockData, 'Tekstil', undefined);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].nama_usaha).toBe('Maju Jaya Tekstil');
  });

  test('TC-10-02: Pencarian kosong (keyword tidak ada di DB)', () => {
    const result = searchAndClusterUmkm(mockData, 'KeywordNgawur123', undefined);
    expect(result.length).toBe(0);
  });

  test('TC-10-03: Pencarian dengan kategori "Makanan"', () => {
    const result = searchAndClusterUmkm(mockData, undefined, 'Makanan');
    expect(result.length).toBe(1);
    expect(result[0].nama_usaha).toBe('Warung Bu Ani');
  });

  test('Pencarian dengan keyword dan kategori sekaligus', () => {
    // Should filter by category first, then search keyword
    const result = searchAndClusterUmkm(mockData, 'Kue', 'Makanan');
    expect(result.length).toBe(1);
    expect(result[0].nama_usaha).toBe('Warung Bu Ani');

    const result2 = searchAndClusterUmkm(mockData, 'Kue', 'Tekstil');
    expect(result2.length).toBe(0);
  });

  test('Pencarian berdasarkan nama produk', () => {
    const result = searchAndClusterUmkm(mockData, 'Kain Katun', undefined);
    expect(result.length).toBe(1);
    expect(result[0].nama_usaha).toBe('Maju Jaya Tekstil');
  });

  test('Clustering/Ranking berdasarkan relevansi', () => {
    // Both 'Maju Jaya Tekstil' and 'Berkah Mesin' (mesin jahit) have some relation if keyword is 'Mesin'
    const data: UmkmItem[] = [
      ...mockData,
      {
        id: 4,
        user_id: 'u4',
        nama_usaha: 'Toko Mesin Jahit', // Match on UMKM name (score 50)
        alamat: '',
        kategori: 'Alat',
        kontak: '',
        nama_user: '',
        produk: [],
        equipment: [],
        totalProduk: 0
      }
    ];

    const result = searchAndClusterUmkm(data, 'Mesin', undefined);
    // 'Toko Mesin Jahit' score = 50 (includes name)
    // 'Berkah Mesin' score = 50 (includes name) + 10 (equipment name) = 60
    expect(result[0].nama_usaha).toBe('Berkah Mesin');
    expect(result[1].nama_usaha).toBe('Toko Mesin Jahit');
  });
});
