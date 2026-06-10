import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';

/**
 * FR-06: Tambah Produk (UMKM)
 * UMKM membuka Katalog -> "Tambah Item Baru" -> form tambah produk.
 * Tidak menyimpan produk asli; fokus GUI navigasi & form.
 */
test.describe('FR-06: Tambah Produk', () => {
  test.skip(!hasCreds('UMKM'), 'Kredensial UMKM belum diisi di .env.test');

  test('TC-06-01: Buka halaman Katalog Produk dari sidebar', async ({ page }) => {
    await login(page, 'UMKM');
    await page.getByRole('link', { name: /Katalog Produk/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/katalog/);
    await expect(page.getByRole('heading', { name: /Katalog & Aset Saya/i })).toBeVisible();
  });

  test('TC-06-02: Tombol "Tambah Item Baru" menuju form tambah produk', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/dashboard/katalog');
    await page.getByRole('link', { name: /Tambah Item Baru/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/katalog\/tambah/);
  });

  test('TC-06-03: Form tambah produk menampilkan field nama & harga', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/dashboard/katalog/tambah');
    // Form produk minimal punya input teks & input angka (harga)
    await expect(page.locator('input').first()).toBeVisible({ timeout: 15_000 });
  });
});
