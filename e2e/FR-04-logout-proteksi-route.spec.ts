import { test, expect } from '@playwright/test';
import { login, logout, hasCreds } from './helpers/auth';

/**
 * FR-04: Logout & Proteksi Route
 * - Akses route terproteksi tanpa sesi -> middleware redirect ke /login
 * - Setelah login, logout mengembalikan ke /login
 */
test.describe('FR-04: Logout & Proteksi Route', () => {
  const protectedRoutes = ['/dashboard', '/dashboard-industri', '/admin', '/profil', '/keranjang'];

  for (const route of protectedRoutes) {
    test(`TC-04-01: Akses ${route} tanpa login diarahkan ke /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('TC-04-02: Logout dari dashboard kembali ke /login', async ({ page }) => {
    test.skip(!hasCreds('UMKM'), 'Kredensial UMKM belum diisi di .env.test');
    await login(page, 'UMKM');
    // Klik tombol "Keluar" di sidebar
    await page.getByRole('button', { name: /Keluar/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('TC-04-03: Setelah logout, route terproteksi tidak bisa diakses', async ({ page }) => {
    test.skip(!hasCreds('UMKM'), 'Kredensial UMKM belum diisi di .env.test');
    await login(page, 'UMKM');
    await logout(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
