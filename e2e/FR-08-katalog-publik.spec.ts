import { test, expect } from '@playwright/test';

/**
 * FR-08: Katalog Publik (lihat produk dari semua UMKM)
 * Halaman /katalog-publik dapat diakses publik (tanpa login).
 */
test.describe('FR-08: Katalog Publik', () => {
  test('TC-08-01: Halaman katalog publik tampil dengan judul', async ({ page }) => {
    await page.goto('/katalog-publik');
    await expect(page.getByRole('heading', { name: /Katalog Publik/i })).toBeVisible();
  });

  test('TC-08-02: Tersedia filter kategori dengan opsi "Semua Kategori"', async ({ page }) => {
    await page.goto('/katalog-publik');
    await expect(page.getByRole('combobox').first()).toBeVisible();
    await expect(page.getByText('Semua Kategori')).toBeVisible();
  });

  test('TC-08-03: Memilih kategori memperbarui URL query', async ({ page }) => {
    await page.goto('/katalog-publik');
    const kategoriSelect = page.getByRole('combobox').first();
    const options = await kategoriSelect.locator('option').allTextContents();
    // Pilih kategori non-default jika ada minimal 2 opsi
    if (options.length > 1) {
      await kategoriSelect.selectOption({ index: 1 });
      await expect(page).toHaveURL(/kategori=/);
    }
  });
});
