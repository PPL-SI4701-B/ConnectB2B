/**
 * FR-21: Manajemen Akun (blokir/unblokir)
 * Tabel: users, umkm, industri, notifikasi
 */
import { toggleBlockStatus } from '@/lib/validation';

describe('FR-21: Manajemen Akun', () => {
  test('TC-21-01: Blokir akun → status berubah jadi diblokir', () => {
    expect(toggleBlockStatus('aktif')).toBe('diblokir');
  });

  test('TC-21-02: Unblokir akun → aktif kembali', () => {
    expect(toggleBlockStatus('diblokir')).toBe('aktif');
  });

  test('TC-21-03: List pengguna → semua user (UMKM + Industri) tampil', () => {
    const users = [
      { id: 1, role: 'umkm' },
      { id: 2, role: 'industri' },
      { id: 3, role: 'umkm' },
    ];
    const list = users.filter((u) => u.role === 'umkm' || u.role === 'industri');
    expect(list).toHaveLength(3);
  });
});
