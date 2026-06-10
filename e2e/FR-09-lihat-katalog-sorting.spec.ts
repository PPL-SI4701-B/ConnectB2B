import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';

/**
 * FR-09: Lihat Katalog
 * Memastikan bahwa role UMKM dan Industri dapat mengakses dan melihat daftar produk di katalog.
 */
test.describe('FR-09: Lihat Katalog', () => {
  test('TC-09-01: UMKM bisa lihat katalog', async ({ page }) => {
    // Lewati jika kredensial belum ada
    test.skip(!hasCreds('UMKM'), 'Kredensial UMKM belum diatur di .env.test');

    // Login UMKM
    await login(page, 'UMKM');

    // Akses katalog (gunakan domcontentloaded agar tidak nunggu image loading lama)
    await page.goto('/katalog-publik', { waitUntil: 'domcontentloaded' });

    // Daftar produk tampil (Grid produk atau state kosong)
    const productGrid = page.locator('.grid').first();
    const emptyState = page.getByText('Tidak ada produk');
    await expect(productGrid.or(emptyState)).toBeVisible();
  });

  test('TC-09-02: Industri bisa lihat katalog', async ({ page }) => {
    // Lewati jika kredensial belum ada
    test.skip(!hasCreds('Industri'), 'Kredensial Industri belum diatur di .env.test');

    // Login Industri
    await login(page, 'Industri');

    // Akses katalog (gunakan domcontentloaded agar tidak nunggu image loading lama)
    await page.goto('/katalog-publik', { waitUntil: 'domcontentloaded' });

    // Daftar produk tampil (Grid produk atau state kosong)
    const productGrid = page.locator('.grid').first();
    const emptyState = page.getByText('Tidak ada produk');
    await expect(productGrid.or(emptyState)).toBeVisible();
  });
});
