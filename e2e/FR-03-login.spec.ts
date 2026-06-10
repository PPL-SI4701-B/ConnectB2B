import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';

/**
 * FR-03: Login Pengguna
 * Alur GUI: /login -> pilih peran -> isi email & sandi -> "Lanjutkan Masuk"
 * Redirect sesuai peran: UMKM->/dashboard, Industri->/dashboard-industri, Admin->/admin
 */
test.describe('FR-03: Login Pengguna', () => {
  test('TC-03-01: Halaman login menampilkan 3 pilihan peran', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Masuk sebagai UMKM/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Masuk sebagai Industri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Masuk sebagai Admin/i })).toBeVisible();
  });

  test('TC-03-02: Memilih peran membuka form email & kata sandi', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Masuk sebagai UMKM/i }).click();
    await expect(page.getByPlaceholder('nama@perusahaan.com')).toBeVisible();
    await expect(page.getByPlaceholder('Minimal 8 karakter')).toBeVisible();
    await expect(page.getByRole('button', { name: /Lanjutkan Masuk/i })).toBeVisible();
  });

  test('TC-03-03: Kredensial salah menampilkan pesan error', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Masuk sebagai UMKM/i }).click();
    await page.getByPlaceholder('nama@perusahaan.com').fill('tidakada@example.com');
    await page.getByPlaceholder('Minimal 8 karakter').fill('salahpassword');
    await page.getByRole('button', { name: /Lanjutkan Masuk/i }).click();
    // Supabase mengembalikan error -> ditampilkan di kotak merah
    await expect(page.locator('.bg-red-50, .text-red-600').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-03-04: Login UMKM berhasil redirect ke /dashboard', async ({ page }) => {
    test.skip(!hasCreds('UMKM'), 'Kredensial UMKM belum diisi di .env.test');
    await login(page, 'UMKM');
    await expect(page).toHaveURL(/\/dashboard(?!-industri)/);
  });

  test('TC-03-05: Login Industri berhasil redirect ke /dashboard-industri', async ({ page }) => {
    test.skip(!hasCreds('Industri'), 'Kredensial Industri belum diisi di .env.test');
    await login(page, 'Industri');
    await expect(page).toHaveURL(/\/dashboard-industri/);
  });

  test('TC-03-06: Login Admin berhasil redirect ke /admin', async ({ page }) => {
    test.skip(!hasCreds('Admin'), 'Kredensial Admin belum diisi di .env.test');
    await login(page, 'Admin');
    await expect(page).toHaveURL(/\/admin/);
  });
});
