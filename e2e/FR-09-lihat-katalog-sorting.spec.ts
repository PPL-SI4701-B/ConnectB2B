import { test, expect } from '@playwright/test';

/**
 * FR-09: Lihat Katalog + Sorting (terbaru/termurah/termahal/rating)
 * Halaman /katalog-publik menyediakan dropdown pengurutan.
 */
test.describe('FR-09: Sorting Katalog', () => {
  test('TC-09-01: Dropdown pengurutan tersedia (default Terbaru)', async ({ page }) => {
    await page.goto('/katalog-publik');
    await expect(page.getByRole('option', { name: 'Terbaru' })).toBeAttached();
  });

  test('TC-09-02: Mengubah urutan ke "Termurah" memperbarui URL sort', async ({ page }) => {
    await page.goto('/katalog-publik');
    // Dropdown sort adalah combobox kedua (pertama = kategori)
    const sortSelect = page.getByRole('combobox').nth(1);
    await sortSelect.selectOption('termurah');
    await expect(page).toHaveURL(/sort=termurah/);
  });

  test('TC-09-03: Mengubah urutan ke "Termahal" memperbarui URL sort', async ({ page }) => {
    await page.goto('/katalog-publik');
    const sortSelect = page.getByRole('combobox').nth(1);
    await sortSelect.selectOption('termahal');
    await expect(page).toHaveURL(/sort=termahal/);
  });
});
