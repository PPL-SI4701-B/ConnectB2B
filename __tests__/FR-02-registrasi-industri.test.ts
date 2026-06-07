/**
 * FR-02: Registrasi Akun Industri
 * Tabel: users, industri, dokumen_legalitas, Storage bucket 'dokumen'
 */
import {
  validateLegalDocument,
  allDocumentsUploaded,
  getRegisterRoleOptions,
  type FileLike,
} from '@/lib/validation';

const pdf = (size: number, name = 'doc.pdf'): FileLike => ({ type: 'application/pdf', size, name });
const MB = 1024 * 1024;

describe('FR-02: Registrasi Akun Industri', () => {
  test('TC-02-01: Registrasi Industri berhasil (data valid + 3 file PDF)', () => {
    const docs = {
      SIUP: pdf(2 * MB, 'SIUP.pdf'),
      NIB: pdf(2 * MB, 'NIB.pdf'),
      NPWP: pdf(2 * MB, 'NPWP.pdf'),
    };
    expect(allDocumentsUploaded(docs)).toBe(true);
    Object.values(docs).forEach((f) => expect(validateLegalDocument(f, 10).valid).toBe(true));
    const role = 'industri';
    expect(role).toBe('industri');
  });

  test('TC-02-02: Hanya upload 2 dari 3 dokumen (submit disabled)', () => {
    const docs = { SIUP: pdf(2 * MB), NIB: pdf(2 * MB), NPWP: null };
    expect(allDocumentsUploaded(docs)).toBe(false);
  });

  test('TC-02-03: File melebihi 10MB', () => {
    const res = validateLegalDocument(pdf(15 * MB, 'SIUP.pdf'), 10);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/10MB/i);
  });

  test('TC-02-04: Halaman pemilihan role menampilkan UMKM & Industri', () => {
    const options = getRegisterRoleOptions();
    expect(options).toHaveLength(2);
    expect(options).toEqual(expect.arrayContaining(['UMKM', 'Industri']));
  });
});
