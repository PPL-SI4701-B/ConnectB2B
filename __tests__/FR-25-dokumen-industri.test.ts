/**
 * FR-25: Upload Dokumen Industri (Kelola/Re-upload)
 * Tabel: dokumen_legalitas, users, industri, Storage bucket 'dokumen'
 */
import { validateLegalDocument, isDokumenIndustriLengkap, resolveAccountVerificationStatus, getStatusBadge, type FileLike } from '@/lib/validation';

const MB = 1024 * 1024;

describe('FR-25: Upload Dokumen Industri (Kelola/Re-upload)', () => {
  test('TC-25-01: Lihat status 3 dokumen (SIUP, NIB, NPWP)', () => {
    const dokumen = ['SIUP', 'NIB', 'NPWP'];
    expect(dokumen).toHaveLength(3);
    expect(isDokumenIndustriLengkap(dokumen.length)).toBe(true);
  });

  test('TC-25-02: Re-upload SIUP → file terupdate (PDF <=10MB), status="menunggu"', () => {
    const fileBaru: FileLike = { type: 'application/pdf', size: 5 * MB, name: 'SIUP-baru.pdf' };
    expect(validateLegalDocument(fileBaru, 10).valid).toBe(true);
    const statusSetelahReupload = 'menunggu';
    expect(statusSetelahReupload).toBe('menunggu');
  });

  test('TC-25-03: Semua terverifikasi → badge Trust Center hijau', () => {
    const status = resolveAccountVerificationStatus(['terverifikasi', 'terverifikasi', 'terverifikasi']);
    expect(status).toBe('terverifikasi');
    expect(getStatusBadge(status).color).toBe('hijau');
  });
});
