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

  test('TC-02-04: Validasi konfirmasi sandi tidak cocok (Langkah 1)', async ({ page }) => {
    await page.goto('/register/industri');
    await page.getByPlaceholder('PT / CV').fill('PT Industri Uji');
    await page.getByPlaceholder('nama@email.com').fill('uji.industri@gmail.com');
    await page.getByPlaceholder('Min. 8 karakter').fill('password123');
    await page.getByPlaceholder('Ulangi sandi').fill('passwordBEDA');
    await page.getByRole('button', { name: /Lanjutkan ke Upload Dokumen/i }).click();
    await expect(page.getByText(/Konfirmasi kata sandi tidak cocok/i)).toBeVisible();
  });

  test('TC-02-05: Form registrasi Industri lengkap (2 langkah) & siap dikirim', async ({ page }) => {
    await page.goto('/register/industri');
    // Langkah 1: data akun valid
    await page.getByPlaceholder('PT / CV').fill('PT Industri E2E ' + Date.now());
    await page.getByPlaceholder('nama@email.com').fill(`e2etest.industri.${Date.now()}@gmail.com`);
    await page.getByPlaceholder('Min. 8 karakter').fill('password123');
    await page.getByPlaceholder('Ulangi sandi').fill('password123');
    await page.getByRole('button', { name: /Lanjutkan ke Upload Dokumen/i }).click();

    // Langkah 2: unggah 3 dokumen (SIUP, NIB, NPWP) — PDF in-memory
    await expect(page.getByText(/SIUP \/ IUT/i)).toBeVisible();
    const pdf = { name: 'dok.pdf', mimeType: 'application/pdf', buffer: Buffer.from('e2e-pdf-dummy') };
    // Tiap kali satu input terisi, input itu hilang -> input tersisa selalu di index 0
    await page.locator('input[type="file"][accept="application/pdf"]').nth(0).setInputFiles(pdf);
    await page.locator('input[type="file"][accept="application/pdf"]').nth(0).setInputFiles(pdf);
    await page.locator('input[type="file"][accept="application/pdf"]').nth(0).setInputFiles(pdf);

    // Ketiga dokumen terunggah -> tombol "Daftarkan Akun" aktif = form valid & siap dikirim.
    // (Submit signUp aktual membutuhkan "Confirm email" OFF di project Supabase test.)
    await expect(page.getByRole('button', { name: /Daftarkan Akun/i })).toBeEnabled();
  });
});
