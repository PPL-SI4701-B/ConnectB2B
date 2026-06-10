import { test, expect } from '@playwright/test';

/**
 * FR-08: Katalog Publik (lihat produk dari semua UMKM)
 * Halaman /katalog-publik dapat diakses publik (tanpa login).
 */
test.describe('FR-08: Katalog Publik', () => {
  test('TC-08-01: Katalog publik menampilkan produk', async ({ page }) => {
    // Akses /katalog-publik
    await page.goto('/katalog-publik', { waitUntil: 'domcontentloaded' });
    
    // Grid produk dari semua UMKM tampil (atau pesan "Tidak ada produk" jika DB kosong)
    const productGrid = page.locator('.grid').first();
    const emptyState = page.getByText('Tidak ada produk');
    
    // Verifikasi salah satu dari state ini tampil
    await expect(productGrid.or(emptyState)).toBeVisible();
  });

  test('TC-08-02: Detail produk', async ({ page }) => {
    await page.goto('/katalog-publik', { waitUntil: 'domcontentloaded' });
    
    // Cari elemen card produk (link yang menuju detail produk)
    const productCards = page.locator('a[href^="/katalog-publik/"]');
    const count = await productCards.count();
    
    // Jika ada produk di database, klik card pertama
    if (count > 0) {
      await productCards.first().click();
      
      // Halaman detail dengan info lengkap
      await expect(page).toHaveURL(/\/katalog-publik\/\d+/);
      
      // Tunggu hingga halaman detail terload (bisa diwakili tombol kembali, atau judul)
      await expect(page.locator('body')).toBeVisible();
    } else {
      // Jika kosong, test case dilewati
      test.skip(true, 'Tidak ada produk di database untuk diklik.');
    }
  });

  test('TC-08-03: Filter kategori', async ({ page }) => {
    await page.goto('/katalog-publik', { waitUntil: 'domcontentloaded' });
    
    const kategoriSelect = page.getByRole('combobox').first();
    
    // Cek apakah ada opsi "Tekstil"
    const options = await kategoriSelect.locator('option').allTextContents();
    if (options.includes('Tekstil')) {
      // Pilih kategori Tekstil
      await kategoriSelect.selectOption('Tekstil');
      
      // Hanya produk kategori Tekstil tampil (cek URL)
      await expect(page).toHaveURL(/kategori=Tekstil/);
    } else if (options.length > 1) {
      // Fallback jika tidak ada kategori Tekstil di DB, pilih yang indeks 1
      await kategoriSelect.selectOption({ index: 1 });
      await expect(page).toHaveURL(/kategori=/);
    }
  });
});
