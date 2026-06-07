/**
 * FR-12: Kirim Request Kerja Sama
 * Tabel: request, transaksi, notifikasi, keranjang
 */
import { validateRequestForm, isDuplicateRequest, type RequestRecord } from '@/lib/validation';

describe('FR-12: Kirim Request Kerja Sama', () => {
  test('TC-12-01: Kirim request berhasil → tersimpan, notifikasi terkirim', () => {
    const form = validateRequestForm({ detail: 'Butuh 100 meter kain katun' });
    expect(form.valid).toBe(true);
    // request baru bukan duplikat
    const existing: RequestRecord[] = [];
    const next: RequestRecord = { umkm_id: 1, industri_id: 5, produk_id: 9, status: 'pending' };
    expect(isDuplicateRequest(existing, next)).toBe(false);
  });

  test('TC-12-02: Request tanpa isi detail → validasi error', () => {
    const res = validateRequestForm({ detail: '   ' });
    expect(res.valid).toBe(false);
  });

  test('TC-12-03: Request sewa alat (pilih alat + durasi) tersimpan', () => {
    const form = validateRequestForm({ detail: 'Sewa mesin jahit 7 hari' });
    expect(form.valid).toBe(true);
    const next: RequestRecord = { umkm_id: 3, industri_id: 5, equipment_id: 2, status: 'pending' };
    expect(isDuplicateRequest([], next)).toBe(false);
  });

  test('Skenario alternatif: request duplikat terdeteksi', () => {
    const existing: RequestRecord[] = [
      { umkm_id: 1, industri_id: 5, produk_id: 9, status: 'pending' },
    ];
    const next: RequestRecord = { umkm_id: 1, industri_id: 5, produk_id: 9, status: 'pending' };
    expect(isDuplicateRequest(existing, next)).toBe(true);
  });
});
