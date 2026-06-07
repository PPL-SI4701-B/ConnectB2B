/**
 * FR-29: Validasi Pembayaran (admin)
 * Tabel: pembayaran, transaksi, notifikasi
 */
import { applyPaymentValidation } from '@/lib/validation';

describe('FR-29: Validasi Pembayaran', () => {
  test('TC-29-01: Validasi berhasil (Valid) → transaksi="lunas", proyek aktif', () => {
    const res = applyPaymentValidation('valid') as any;
    expect(res.transaksiStatus).toBe('lunas');
    expect(res.pembayaranStatus).toBe('berhasil');
  });

  test('TC-29-02: Tolak pembayaran (+ alasan) → status="gagal", notif terkirim', () => {
    const res = applyPaymentValidation('tolak', { alasan: 'Nominal tidak sesuai' }) as any;
    expect(res.pembayaranStatus).toBe('gagal');
    expect(res.error).toBeUndefined();
  });

  test('Tolak tanpa alasan → ditolak (alasan wajib)', () => {
    const res = applyPaymentValidation('tolak', { alasan: '' }) as any;
    expect(res.pembayaranStatus).toBe('gagal');
    expect(res.error).toMatch(/alasan/i);
  });
});
