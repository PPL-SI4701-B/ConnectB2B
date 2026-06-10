import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';

/**
 * FR-12: Kirim Request Kerjasama
 * Industri mengirim permintaan kerja sama ke UMKM (atau UMKM ke UMKM untuk sewa alat).
 * Kondisi: Pengguna sudah login, sudah memilih UMKM target atau item dari keranjang.
 */
test.describe.serial('FR-12: Kirim Request Kerjasama', () => {
  test.skip(!hasCreds('Industri'), 'Kredensial Industri belum diisi di .env.test');

  // Helper untuk memastikan ada item di keranjang sebelum test
  const ensureCartHasItem = async (page) => {
    await page.goto('/keranjang');
    const emptyMsg = page.getByText(/Keranjang Anda Kosong/i);
    
    // Jika kosong, pergi ke katalog publik, klik produk pertama, dan klik "Ajukan Kerjasama"
    if (await emptyMsg.isVisible()) {
      await page.goto('/katalog-publik');
      const productCards = page.locator('a[href^="/katalog-publik/"]');
      if (await productCards.count() > 0) {
        await productCards.first().click();
        await page.getByRole('button', { name: /Ajukan Kerjasama/i }).click();
        
        // Wait for either the URL to change OR an error box to appear
        const errorBox = page.locator('.bg-red-50');
        await Promise.race([
          page.waitForURL(/\/keranjang/, { timeout: 15000 }),
          errorBox.waitFor({ state: 'visible', timeout: 15000 }).then(async () => {
            const errText = await errorBox.textContent();
            throw new Error(`Gagal menambahkan ke keranjang: ${errText}`);
          })
        ]);
      } else {
        throw new Error("Katalog publik kosong, tidak bisa melanjutkan test FR-12.");
      }
    }
  };

  test('TC-12-02: Request tanpa isi detail', async ({ page }) => {
    // Kita jalankan TC-12-02 (Error) terlebih dahulu agar tidak mengosongkan keranjang untuk test sukses
    await login(page, 'Industri');
    await ensureCartHasItem(page);

    if (await page.getByText(/Keranjang Anda Kosong/i).isVisible()) {
       test.skip(true, 'Tidak ada produk di database untuk dites');
    }

    // Form kosong (textarea spesifikasi dikosongkan)
    await page.locator('textarea').fill('');
    
    // Coba submit
    await page.getByRole('button', { name: /Review & Ajukan Request/i }).click();
    
    // Validasi error (Playwright akan mengecek validasi browser HTML5 required atau pesan error)
    // URL seharusnya tidak berubah karena diblokir
    await expect(page).toHaveURL(/\/keranjang/);
  });

  test('TC-12-01: Kirim request berhasil', async ({ page }) => {
    await login(page, 'Industri');
    await ensureCartHasItem(page);

    if (await page.getByText(/Keranjang Anda Kosong/i).isVisible()) {
       test.skip(true, 'Tidak ada produk di database untuk dites');
    }

    // Isi form dengan jenis permintaan Maklon
    await page.getByRole('combobox').selectOption('Pesan Maklon (Jasa)');
    await page.locator('textarea').fill('Saya ingin memesan 1000 pcs sesuai dengan spesifikasi.');
    
    // Submit
    await page.getByRole('button', { name: /Review & Ajukan Request/i }).click();

    // Verifikasi redirect ke halaman transaksi (request tersimpan)
    await expect(page).toHaveURL(/\/pantau-transaksi/);
  });

  test('TC-12-03: Request sewa alat', async ({ page }) => {
    await login(page, 'Industri');
    await ensureCartHasItem(page);

    if (await page.getByText(/Keranjang Anda Kosong/i).isVisible()) {
       test.skip(true, 'Tidak ada produk di database untuk dites');
    }

    // Isi form dengan jenis permintaan Sewa Alat
    await page.getByRole('combobox').selectOption('Sewa Alat');
    await page.locator('textarea').fill('Saya ingin sewa alat selama 3 bulan.');
    
    // Submit
    await page.getByRole('button', { name: /Review & Ajukan Request/i }).click();

    // Verifikasi redirect ke halaman transaksi (request tersimpan)
    await expect(page).toHaveURL(/\/pantau-transaksi/);
  });
});
