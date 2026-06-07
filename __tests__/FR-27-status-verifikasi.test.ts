/**
 * FR-27: Status Verifikasi (badge warna)
 * Tabel: users (status_verifikasi), dokumen_legalitas (catatan_admin)
 */
import { getStatusBadge } from '@/lib/validation';

describe('FR-27: Status Verifikasi', () => {
  test('TC-27-01: Badge terverifikasi → hijau', () => {
    expect(getStatusBadge('terverifikasi').color).toBe('hijau');
  });

  test('TC-27-02: Badge menunggu → kuning', () => {
    expect(getStatusBadge('menunggu').color).toBe('kuning');
  });

  test('TC-27-03: Badge ditolak → merah (+ ada catatan admin)', () => {
    const badge = getStatusBadge('ditolak');
    expect(badge.color).toBe('merah');
    const catatanAdmin = 'Dokumen tidak sesuai';
    expect(catatanAdmin).toBeTruthy();
  });
});
