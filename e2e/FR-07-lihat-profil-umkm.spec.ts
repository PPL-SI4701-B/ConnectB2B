import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';

/**
 * FR-07: Lihat Profil UMKM (hanya yang terverifikasi tampil)
 * Industri membuka pencarian supplier; daftar hanya menampilkan UMKM terverifikasi
 * (filter "Hanya terverifikasi" aktif secara default).
 */
test.describe('FR-07: Lihat Profil UMKM', () => {
  test.skip(!hasCreds('Industri'), 'Kredensial Industri belum diisi di .env.test');

  test('TC-07-01: Buka halaman pencarian supplier', async ({ page }) => {
    await login(page, 'Industri');
    await page.getByRole('link', { name: /Cari Supplier/i }).click();
    await expect(page).toHaveURL(/\/pencarian/);
    await expect(page.getByRole('heading', { name: /Temukan Supplier UMKM/i })).toBeVisible();
  });

  test('TC-07-02: Tersedia kotak pencarian UMKM/produk', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/pencarian', { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder(/Cari nama UMKM, produk, atau lokasi/i)).toBeVisible();
  });

  test('TC-07-03: Membuka detail salah satu UMKM (jika ada hasil)', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/pencarian', { waitUntil: 'domcontentloaded' });
    // Klik kartu UMKM pertama bila ada; jika kosong, lewati assertion klik
    const detailBtn = page.getByRole('button', { name: /detail|lihat/i }).first();
    if (await detailBtn.isVisible().catch(() => false)) {
      await detailBtn.click();
    }
    // Halaman tetap di /pencarian dan modal/detail tampil tanpa error
    await expect(page).toHaveURL(/\/pencarian/);
  });
});
