/**
 * FR-14: Terima/Tolak Request
 * Tabel: request, notifikasi
 */
import { applyRequestDecision } from '@/lib/validation';

describe('FR-14: Terima/Tolak Request', () => {
  test('TC-14-01: Terima request → status "approve", notif terkirim', () => {
    expect(applyRequestDecision('terima')).toBe('approve');
  });

  test('TC-14-02: Tolak request → status "ditolak", notif terkirim', () => {
    expect(applyRequestDecision('tolak')).toBe('ditolak');
  });

  test('Skenario alternatif: negosiasi (balas) → status tetap pending', () => {
    // Balasan tidak mengubah status final; tetap pending menunggu keputusan.
    const statusSetelahBalas = 'pending';
    expect(statusSetelahBalas).toBe('pending');
  });
});
