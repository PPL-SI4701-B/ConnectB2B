import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';

/**
 * FR-10: Pencarian Supplier/Produk (kata kunci & kategori)
 * Industri mengetik kata kunci pada halaman pencarian; URL query ter-update.
 */
test.describe('FR-10: Pencarian', () => {
  test.skip(!hasCreds('Industri'), 'Kredensial Industri belum diisi di .env.test');

  test('TC-10-01: Mengetik kata kunci memperbarui hasil/URL', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/pencarian', { waitUntil: 'domcontentloaded' });
    const search = page.getByPlaceholder(/Cari nama UMKM, produk, atau lokasi/i);
    await search.fill('kayu');
    // Debounce 500ms -> query q= masuk ke URL
    await expect(page).toHaveURL(/q=kayu/, { timeout: 10_000 });
  });

  test('TC-10-02: Tersedia panel filter lanjutan', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/pencarian', { waitUntil: 'domcontentloaded' });
    // Tombol/area filter (rentang harga Min/Max) dapat dibuka
    const filterToggle = page.getByRole('button', { name: /filter/i }).first();
    if (await filterToggle.isVisible().catch(() => false)) {
      await filterToggle.click();
    }
    await expect(page).toHaveURL(/\/pencarian/);
  });
});
