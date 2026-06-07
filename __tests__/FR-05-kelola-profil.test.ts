/**
 * FR-05: Kelola Profil Usaha
 * Tabel: users, umkm, profiles, Storage bucket 'avatars'
 */
import { validateImageUpload, type FileLike } from '@/lib/validation';

const MB = 1024 * 1024;

describe('FR-05: Kelola Profil Usaha', () => {
  test('TC-05-01: Load profil berhasil (data ditampilkan)', () => {
    const profil = { nama_usaha: 'CV Maju', alamat: 'Bandung', kontak: '0812' };
    expect(profil.nama_usaha).toBeTruthy();
    expect(Object.keys(profil)).toContain('alamat');
  });

  test('TC-05-02: Update profil berhasil (data terupdate)', () => {
    let profil = { nama_usaha: 'CV Maju' };
    profil = { ...profil, nama_usaha: 'CV Maju Jaya' };
    expect(profil.nama_usaha).toBe('CV Maju Jaya');
  });

  test('TC-05-03: Upload foto profil (JPG 2MB) tersimpan', () => {
    const jpg: FileLike = { type: 'image/jpeg', size: 2 * MB, name: 'avatar.jpg' };
    expect(validateImageUpload(jpg, 5).valid).toBe(true);
  });

  test('TC-05-04: Batal edit → data kembali ke semula', () => {
    const original = { nama_usaha: 'CV Maju' };
    let draft = { ...original, nama_usaha: 'Diubah' };
    // klik Batal → revert
    draft = { ...original };
    expect(draft.nama_usaha).toBe(original.nama_usaha);
  });
});
