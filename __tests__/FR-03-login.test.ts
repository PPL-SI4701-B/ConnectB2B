/**
 * FR-03: Login Pengguna
 * Tabel: users (role, status_verifikasi)
 */
import { resolveRedirectPath, resolveLoginOutcome } from '@/lib/validation';

// Simulasi verifikasi kredensial Supabase Auth.
function verifyCredential(stored: { email: string; password: string }, input: { email: string; password: string }) {
  return stored.email === input.email && stored.password === input.password;
}

describe('FR-03: Login Pengguna', () => {
  test('TC-03-01: Login berhasil UMKM → /dashboard', () => {
    const outcome = resolveLoginOutcome({ role: 'umkm', status_verifikasi: 'terverifikasi' });
    expect(outcome).toEqual({ type: 'redirect', path: '/dashboard' });
  });

  test('TC-03-02: Login berhasil Industri → /dashboard-industri', () => {
    const outcome = resolveLoginOutcome({ role: 'industri', status_verifikasi: 'terverifikasi' });
    expect(outcome).toEqual({ type: 'redirect', path: '/dashboard-industri' });
  });

  test('TC-03-03: Login berhasil Admin → /admin', () => {
    const outcome = resolveLoginOutcome({ role: 'admin', status_verifikasi: 'menunggu' });
    expect(outcome).toEqual({ type: 'redirect', path: '/admin' });
    expect(resolveRedirectPath('admin')).toBe('/admin');
  });

  test('TC-03-04: Kredensial salah → gagal', () => {
    const stored = { email: 'a@mail.com', password: 'password123' };
    expect(verifyCredential(stored, { email: 'a@mail.com', password: 'salah' })).toBe(false);
  });

  test('TC-03-05: Akun menunggu verifikasi → halaman info menunggu', () => {
    const outcome = resolveLoginOutcome({ role: 'umkm', status_verifikasi: 'menunggu' });
    expect(outcome).toEqual({ type: 'info', status: 'menunggu' });
  });

  test('TC-03-06: Akun ditolak → halaman info ditolak', () => {
    const outcome = resolveLoginOutcome({ role: 'umkm', status_verifikasi: 'ditolak' });
    expect(outcome).toEqual({ type: 'info', status: 'ditolak' });
  });
});
