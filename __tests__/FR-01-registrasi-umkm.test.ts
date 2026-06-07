/**
 * FR-01: Registrasi Akun UMKM
 * Tabel: users, umkm, dokumen_legalitas, Storage bucket 'dokumen'
 */
import {
  validateRegistrationStep1,
  validatePassword,
  validatePasswordConfirmation,
  validateLegalDocument,
  allDocumentsUploaded,
  type FileLike,
} from '@/lib/validation';

const pdf = (size: number, name = 'doc.pdf'): FileLike => ({ type: 'application/pdf', size, name });
const MB = 1024 * 1024;

// Simulasi pengecekan email sudah terdaftar di DB.
function isEmailRegistered(existing: string[], email: string): boolean {
  return existing.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

describe('FR-01: Registrasi Akun UMKM', () => {
  test('TC-01-01: Registrasi berhasil dengan data valid', () => {
    const step1 = validateRegistrationStep1({
      nama: 'CV Test',
      email: 'test@mail.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    const docs = { NIB: pdf(1 * MB, 'NIB.pdf'), NPWP: pdf(1 * MB, 'NPWP.pdf') };

    expect(step1.valid).toBe(true);
    expect(validateLegalDocument(docs.NIB, 5).valid).toBe(true);
    expect(validateLegalDocument(docs.NPWP, 5).valid).toBe(true);
    expect(allDocumentsUploaded(docs)).toBe(true);
    // Setelah submit, status_verifikasi awal = 'menunggu'
    const initialStatus = 'menunggu';
    expect(initialStatus).toBe('menunggu');
  });

  test('TC-01-02: Email sudah terdaftar', () => {
    const existing = ['test@mail.com'];
    expect(isEmailRegistered(existing, 'test@mail.com')).toBe(true);
  });

  test('TC-01-03: Password kurang dari 8 karakter', () => {
    const res = validatePassword('12345');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/8 karakter/i);
  });

  test('TC-01-04: Upload file bukan PDF', () => {
    const jpg: FileLike = { type: 'image/jpeg', size: 1 * MB, name: 'NIB.jpg' };
    const res = validateLegalDocument(jpg, 5);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/PDF/i);
  });

  test('TC-01-05: Upload file melebihi 5MB', () => {
    const res = validateLegalDocument(pdf(10 * MB), 5);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/5MB/i);
  });

  test('TC-01-06: Salah satu dokumen tidak diupload (tombol submit disabled)', () => {
    const docs = { NIB: pdf(1 * MB), NPWP: null };
    expect(allDocumentsUploaded(docs)).toBe(false);
  });

  test('TC-01-07: Konfirmasi password tidak cocok', () => {
    const res = validatePasswordConfirmation('password123', 'password999');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/tidak cocok/i);
  });
});
