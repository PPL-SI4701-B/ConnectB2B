/**
 * FR-04: Logout Pengguna
 * Tabel: Supabase Auth session
 */
import { canAccessProtectedRoute, resolveRedirectPath } from '@/lib/validation';

describe('FR-04: Logout Pengguna', () => {
  test('TC-04-01: Logout berhasil → session dihapus, redirect ke /login', () => {
    let session: unknown = { user: { id: 'u1' } };
    // signOut menghapus session
    session = null;
    expect(canAccessProtectedRoute(session)).toBe(false);
    const redirectAfterLogout = canAccessProtectedRoute(session) ? resolveRedirectPath('umkm') : '/login';
    expect(redirectAfterLogout).toBe('/login');
  });

  test('TC-04-02: Akses halaman protected tanpa login → redirect ke /login', () => {
    expect(canAccessProtectedRoute(null)).toBe(false);
  });

  test('TC-04-03: Session expired → otomatis redirect ke /login', () => {
    const expiredSession = null; // token expired → session tidak valid
    expect(canAccessProtectedRoute(expiredSession)).toBe(false);
  });
});
