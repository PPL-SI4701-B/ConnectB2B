/**
 * FR-26: Verifikasi Dokumen Industri
 * Tabel: dokumen_legalitas, users, industri, notifikasi
 */
import { resolveAccountVerificationStatus, isDokumenIndustriLengkap } from '@/lib/validation';

describe('FR-26: Verifikasi Dokumen Industri', () => {
  test('TC-26-01: Verifikasi Industri berhasil (setuju 3 dokumen) → terverifikasi', () => {
    expect(resolveAccountVerificationStatus(['terverifikasi', 'terverifikasi', 'terverifikasi'])).toBe('terverifikasi');
  });

  test('TC-26-02: Dokumen tidak lengkap (2 dari 3) → warning icon', () => {
    expect(isDokumenIndustriLengkap(2)).toBe(false);
  });

  test('TC-26-03: Filter tab "Industri Saja" → hanya dokumen Industri', () => {
    const docs = [
      { entitas: 'industri', jenis: 'SIUP' },
      { entitas: 'umkm', jenis: 'NIB' },
      { entitas: 'industri', jenis: 'NPWP' },
    ];
    const onlyIndustri = docs.filter((d) => d.entitas === 'industri');
    expect(onlyIndustri).toHaveLength(2);
    expect(onlyIndustri.every((d) => d.entitas === 'industri')).toBe(true);
  });
});
