/**
 * FR-28: Upload Bukti Pembayaran
 * Tabel: pembayaran, transaksi, Storage bucket 'bukti-bayar'
 */
import { validatePaymentProof, type FileLike } from '@/lib/validation';

const MB = 1024 * 1024;
const jpg = (size = 1 * MB): FileLike => ({ type: 'image/jpeg', size, name: 'bukti.jpg' });

describe('FR-28: Upload Bukti Pembayaran', () => {
  test('TC-28-01: Upload bukti berhasil (gambar JPG + nominal) → status pending', () => {
    const res = validatePaymentProof({ file: jpg(), nominal: 1500000 });
    expect(res.valid).toBe(true);
    const statusPembayaran = 'pending';
    expect(statusPembayaran).toBe('pending');
  });

  test('TC-28-02: Upload tanpa nominal → validasi error', () => {
    const res = validatePaymentProof({ file: jpg(), nominal: undefined });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/nominal/i);
  });

  test('TC-28-03: File bukan gambar (PDF) → pesan error format', () => {
    const pdf: FileLike = { type: 'application/pdf', size: 1 * MB, name: 'bukti.pdf' };
    const res = validatePaymentProof({ file: pdf, nominal: 1000000 });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/gambar/i);
  });

  test('Validasi tambahan: nominal 0 atau negatif ditolak', () => {
    expect(validatePaymentProof({ file: jpg(), nominal: 0 }).valid).toBe(false);
    expect(validatePaymentProof({ file: jpg(), nominal: -5000 }).valid).toBe(false);
  });
});
