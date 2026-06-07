/**
 * FR-22: Pengelolaan Konten (moderasi)
 * Tabel: produk, equipment, notifikasi
 */
import { applyContentModeration } from '@/lib/validation';

describe('FR-22: Pengelolaan Konten', () => {
  test('TC-22-01: Hapus konten → produk dihapus, notif ke pemilik', () => {
    const res = applyContentModeration('hapus');
    expect(res.removed).toBe(true);
    expect(res.notifyOwner).toBe(true);
  });

  test('TC-22-02: Abaikan laporan → laporan ditutup, produk tetap', () => {
    const res = applyContentModeration('abaikan');
    expect(res.removed).toBe(false);
  });
});
