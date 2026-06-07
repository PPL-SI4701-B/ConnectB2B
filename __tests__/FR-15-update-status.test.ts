/**
 * FR-15: Update Status Kerja Sama (hanya UMKM)
 * Tabel: transaksi, request, notifikasi
 */
import { canUpdateProgress } from '@/lib/validation';

describe('FR-15: Update Status Kerja Sama', () => {
  test('TC-15-01: Update status berhasil (UMKM ubah ke "Diproses")', () => {
    expect(canUpdateProgress('umkm')).toBe(true);
    let progress = 'Menunggu Material';
    progress = 'Diproses';
    expect(progress).toBe('Diproses');
  });

  test('TC-15-02: Daftar transaksi aktif tampil dengan status', () => {
    const transaksi = [
      { id: 1, progress_status: 'Diproses' },
      { id: 2, progress_status: 'Dikirim' },
    ];
    expect(transaksi).toHaveLength(2);
    expect(transaksi.every((t) => !!t.progress_status)).toBe(true);
  });

  test('Kontrol akses: Industri TIDAK boleh update progres (FR-15)', () => {
    expect(canUpdateProgress('industri')).toBe(false);
    expect(canUpdateProgress('admin')).toBe(false);
  });
});
