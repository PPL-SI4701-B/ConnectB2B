/**
 * FR-07: Lihat Profil UMKM
 * Tabel: umkm, profiles, ulasan, users
 */
import { filterVerifiedUmkm } from '@/lib/validation';

const umkmList = [
  { id: 1, nama_usaha: 'CV Terverifikasi', status_verifikasi: 'terverifikasi' },
  { id: 2, nama_usaha: 'CV Menunggu', status_verifikasi: 'menunggu' },
  { id: 3, nama_usaha: 'CV Terverifikasi 2', status_verifikasi: 'terverifikasi' },
];

describe('FR-07: Lihat Profil UMKM', () => {
  test('TC-07-01: List UMKM tampil (hanya yang terverifikasi)', () => {
    const visible = filterVerifiedUmkm(umkmList);
    expect(visible).toHaveLength(2);
    expect(visible.every((u) => u.status_verifikasi === 'terverifikasi')).toBe(true);
  });

  test('TC-07-02: Klik UMKM → panel detail muncul (data dipilih)', () => {
    const visible = filterVerifiedUmkm(umkmList);
    const selected = visible.find((u) => u.id === 1) ?? null;
    expect(selected).not.toBeNull();
    expect(selected?.nama_usaha).toBe('CV Terverifikasi');
  });

  test('TC-07-03: UMKM belum verifikasi tidak tampil di list', () => {
    const visible = filterVerifiedUmkm(umkmList);
    expect(visible.find((u) => u.id === 2)).toBeUndefined();
  });
});
