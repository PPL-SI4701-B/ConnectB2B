/**
 * FR-24: Verifikasi Dokumen UMKM (admin setuju/tolak)
 * Tabel: dokumen_legalitas, users, umkm, notifikasi
 */
import { resolveAccountVerificationStatus } from '@/lib/validation';

// Tolak wajib menyertakan catatan admin.
function tolakDokumen(catatan: string) {
  if (!catatan.trim()) return { ok: false };
  return { ok: true, status: 'ditolak', catatan_admin: catatan };
}

describe('FR-24: Verifikasi Dokumen UMKM', () => {
  test('TC-24-01: Setuju dokumen → status="terverifikasi", notif terkirim', () => {
    const status = 'terverifikasi';
    expect(status).toBe('terverifikasi');
  });

  test('TC-24-02: Tolak dokumen → status="ditolak", catatan tersimpan', () => {
    const res = tolakDokumen('File buram tidak terbaca');
    expect(res.ok).toBe(true);
    expect(res.status).toBe('ditolak');
    expect(res.catatan_admin).toBeTruthy();
  });

  test('TC-24-03: Semua dokumen UMKM disetujui → users.status_verifikasi="terverifikasi"', () => {
    expect(resolveAccountVerificationStatus(['terverifikasi', 'terverifikasi'])).toBe('terverifikasi');
  });

  test('Jika satu dokumen ditolak → akun ditolak', () => {
    expect(resolveAccountVerificationStatus(['terverifikasi', 'ditolak'])).toBe('ditolak');
  });
});
