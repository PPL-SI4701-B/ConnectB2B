/**
 * FR-11: Filter Pencarian & Keranjang Kolaborasi
 * Tabel: keranjang, produk, equipment, industri, umkm
 */
import { searchAndClusterUmkm } from '@/lib/searchAlgorithm';
import { addToCart, updateCartQty, removeFromCart, canCheckout, type CartItem } from '@/lib/validation';

const mockData: any[] = [
  { id: 1, nama_usaha: 'CV Bandung Tekstil', alamat: 'Jl. Asia Afrika, Bandung', kategori: 'Tekstil', produk: [], equipment: [], status_verifikasi: 'terverifikasi' },
  { id: 2, nama_usaha: 'CV Jakarta Food', alamat: 'Jl. Thamrin, Jakarta', kategori: 'Makanan', produk: [], equipment: [], status_verifikasi: 'terverifikasi' },
];

describe('FR-11: Filter & Keranjang Kolaborasi', () => {
  test('TC-11-01: Filter lokasi Bandung → hanya UMKM di Bandung', () => {
    const result = searchAndClusterUmkm(mockData, { lokasi: 'Bandung' });
    expect(result).toHaveLength(1);
    expect(result[0].nama_usaha).toBe('CV Bandung Tekstil');
  });

  test('TC-11-02: Tambah ke keranjang → item masuk keranjang', () => {
    let cart: CartItem[] = [];
    cart = addToCart(cart, { id: 10, nama: 'Kain', qty: 1 });
    expect(cart).toHaveLength(1);
    expect(cart[0].id).toBe(10);
  });

  test('TC-11-03: Ubah qty keranjang jadi 5 → qty terupdate', () => {
    let cart: CartItem[] = [{ id: 10, nama: 'Kain', qty: 1 }];
    cart = updateCartQty(cart, 10, 5);
    expect(cart[0].qty).toBe(5);
  });

  test('TC-11-04: Hapus dari keranjang → item hilang', () => {
    let cart: CartItem[] = [{ id: 10, qty: 1 }, { id: 11, qty: 2 }];
    cart = removeFromCart(cart, 10);
    expect(cart).toHaveLength(1);
    expect(cart.find((c) => c.id === 10)).toBeUndefined();
  });

  test('Skenario alternatif: checkout keranjang kosong → error', () => {
    expect(canCheckout([]).valid).toBe(false);
    expect(canCheckout([{ id: 1, qty: 1 }]).valid).toBe(true);
  });
});
