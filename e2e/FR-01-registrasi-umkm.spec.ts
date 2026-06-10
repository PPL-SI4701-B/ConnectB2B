import { test, expect } from '@playwright/test';

/**
 * FR-01: Registrasi Akun UMKM
 * Alur GUI: /register -> pilih "Daftar sebagai UMKM" -> form 3 langkah
 * (Data Akun -> Rekening Bank -> Dokumen Legalitas)
 *
 * Test ini TIDAK menyelesaikan pendaftaran (tidak submit ke Supabase) agar tidak
 * membuat akun sampah. Fokus: memverifikasi GUI form & validasi langkah berjalan.
 */
test.describe('FR-01: Registrasi UMKM', () => {
  test('TC-01-01: Halaman pilih peran menampilkan opsi Daftar UMKM', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /Daftar Akun Baru/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Daftar sebagai UMKM/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Daftar sebagai Industri/i })).toBeVisible();
  });

  test('TC-01-02: Klik Daftar UMKM membuka form 3 langkah', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Daftar sebagai UMKM/i }).click();
    await expect(page).toHaveURL(/\/register\/umkm/);
    await expect(page.getByRole('heading', { name: /Daftar UMKM/i })).toBeVisible();
    await expect(page.getByText('Data Akun')).toBeVisible();
    await expect(page.getByText('Rekening Bank')).toBeVisible();
    await expect(page.getByText('Dokumen Legalitas')).toBeVisible();
  });

  test('TC-01-03: Validasi kata sandi tidak cocok di Langkah 1', async ({ page }) => {
    await page.goto('/register/umkm');
    await page.getByPlaceholder('PT / CV / Nama Usaha').fill('UMKM Uji Coba');
    await page.getByPlaceholder('nama@email.com').fill('uji.umkm@example.com');
    await page.getByPlaceholder('Min. 8 karakter').fill('password123');
    await page.getByPlaceholder('Ulangi sandi').fill('passwordBEDA');
    await page.getByRole('button', { name: /^Lanjutkan/i }).click();
    await expect(page.getByText(/Konfirmasi kata sandi tidak cocok/i)).toBeVisible();
  });

  test('TC-01-04: Data Langkah 1 valid lanjut ke Langkah 2 (Rekening Bank)', async ({ page }) => {
    await page.goto('/register/umkm');
    await page.getByPlaceholder('PT / CV / Nama Usaha').fill('UMKM Uji Coba');
    await page.getByPlaceholder('nama@email.com').fill('uji.umkm@example.com');
    await page.getByPlaceholder('Min. 8 karakter').fill('password123');
    await page.getByPlaceholder('Ulangi sandi').fill('password123');
    await page.getByRole('button', { name: /^Lanjutkan/i }).click();
    // Langkah 2 menampilkan pemilihan bank
    await expect(page.getByText(/Informasi Rekening Pencairan/i)).toBeVisible();
    await expect(page.getByPlaceholder('Contoh: 1234567890')).toBeVisible();
  });
});
