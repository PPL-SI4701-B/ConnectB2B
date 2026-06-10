import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';

/**
 * FR-05: Kelola Profil
 * UMKM/Industri dapat membuka halaman profil dan melihat/ubah data.
 */
test.describe('FR-05: Kelola Profil', () => {
  test.skip(!hasCreds('UMKM'), 'Kredensial UMKM belum diisi di .env.test');

  test('TC-05-01: Buka halaman Profil dari sidebar', async ({ page }) => {
    await login(page, 'UMKM');
    await page.getByRole('link', { name: /^Profil$/i }).click();
    await expect(page).toHaveURL(/\/profil/);
  });

  test('TC-05-02: Halaman profil menampilkan data akun', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/profil');
    // Minimal ada input yang bisa diedit pada form profil
    await expect(page.locator('input').first()).toBeVisible({ timeout: 15_000 });
  });
});
