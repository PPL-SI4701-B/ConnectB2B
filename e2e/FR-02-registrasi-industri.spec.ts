import { test, expect } from '@playwright/test';

/**
 * FR-02: Registrasi Akun Industri
 * Alur GUI: /register -> pilih "Daftar sebagai Industri" -> form pendaftaran Industri.
 * Tidak submit ke Supabase (hindari akun sampah); fokus pada GUI & navigasi.
 */
test.describe('FR-02: Registrasi Industri', () => {
  test('TC-02-01: Klik Daftar Industri menuju form Industri', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Daftar sebagai Industri/i }).click();
    await expect(page).toHaveURL(/\/register\/industri/);
  });

  test('TC-02-02: Form Industri menampilkan field email & kata sandi', async ({ page }) => {
    await page.goto('/register/industri');
    // Field umum pada form registrasi (email + password)
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('TC-02-03: Tersedia tautan kembali ke halaman Login', async ({ page }) => {
    await page.goto('/register/industri');
    await expect(page.getByRole('link', { name: /Masuk/i }).first()).toBeVisible();
  });
});
