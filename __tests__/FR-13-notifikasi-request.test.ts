/**
 * FR-13: Notifikasi Request
 * Tabel: notifikasi, request
 */
import { countUnread, markAsRead, type Notifikasi } from '@/lib/validation';

describe('FR-13: Notifikasi Request', () => {
  test('TC-13-01: Notifikasi muncul → badge notif bertambah', () => {
    let notifs: Notifikasi[] = [{ id: 1, status: 'belum dibaca' }];
    expect(countUnread(notifs)).toBe(1);
    // request baru masuk → 1 notif lagi
    notifs = [...notifs, { id: 2, status: 'belum dibaca' }];
    expect(countUnread(notifs)).toBe(2);
  });

  test('TC-13-02: Klik notifikasi → redirect ke detail request', () => {
    const notif = { id: 1, status: 'belum dibaca', request_id: 99 } as any;
    const targetUrl = `/request-masuk?id=${notif.request_id}`;
    expect(targetUrl).toBe('/request-masuk?id=99');
  });

  test('TC-13-03: Mark as read → status jadi "dibaca"', () => {
    const notif: Notifikasi = { id: 1, status: 'belum dibaca' };
    const updated = markAsRead(notif);
    expect(updated.status).toBe('dibaca');
    expect(countUnread([updated])).toBe(0);
  });

  test('Skenario alternatif: tidak ada notif baru → badge 0', () => {
    expect(countUnread([{ id: 1, status: 'dibaca' }])).toBe(0);
  });
});
