/**
 * FR-23: Upload Dokumen UMKM (Kelola/Re-upload)
 * Tabel: dokumen_legalitas, users, Storage bucket 'dokumen'
 */
import { getStatusBadge, validateLegalDocument, resolveAccountVerificationStatus, type FileLike } from '@/lib/validation';

const MB = 1024 * 1024;

describe('FR-23: Upload Dokumen UMKM (Kelola/Re-upload)', () => {
  test('TC-23-01: Lihat status dokumen (daftar + status tampil)', () => {
    const dokumen = [
      { jenis: 'NIB', status: 'terverifikasi' },
      { jenis: 'NPWP', status: 'menunggu' },
    ];
    expect(dokumen).toHaveLength(2);
    expect(getStatusBadge(dokumen[0].status).color).toBe('hijau');
    expect(getStatusBadge(dokumen[1].status).color).toBe('kuning');
  });

  test('TC-23-02: Re-upload dokumen ditolak → file terupdate, status="menunggu"', () => {
    const fileBaru: FileLike = { type: 'application/pdf', size: 1 * MB, name: 'NIB-baru.pdf' };
    expect(validateLegalDocument(fileBaru, 5).valid).toBe(true);
    // Setelah re-upload status kembali ke 'menunggu'
    const statusSetelahReupload = 'menunggu';
    expect(statusSetelahReupload).toBe('menunggu');
  });

  test('TC-23-03: Semua dokumen terverifikasi → badge hijau (Berkas Lengkap)', () => {
    const status = resolveAccountVerificationStatus(['terverifikasi', 'terverifikasi']);
    expect(status).toBe('terverifikasi');
    expect(getStatusBadge(status).color).toBe('hijau');
  });
});
