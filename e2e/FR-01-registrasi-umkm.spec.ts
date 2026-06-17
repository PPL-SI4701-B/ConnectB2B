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

  // Helper: lewati Langkah 1 dengan data valid
  async function isiLangkah1(page: any, email: string) {
    await page.getByPlaceholder('PT / CV / Nama Usaha').fill('UMKM Uji ' + Date.now());
    await page.getByPlaceholder('nama@email.com').fill(email);
    await page.getByPlaceholder('Min. 8 karakter').fill('password123');
    await page.getByPlaceholder('Ulangi sandi').fill('password123');
    await page.getByRole('button', { name: /^Lanjutkan/i }).click();
    await expect(page.getByText(/Informasi Rekening Pencairan/i)).toBeVisible();
  }

  test('TC-01-05: Validasi nomor rekening harus angka (Langkah 2)', async ({ page }) => {
    await page.goto('/register/umkm');
    await isiLangkah1(page, 'uji.rek@example.com');
    // Pilih bank, isi rekening dengan HURUF (tidak valid)
    await page.locator('select[name="nama_bank"]').selectOption('BCA');
    await page.getByPlaceholder('Contoh: 1234567890').fill('abcdef');
    await page.getByPlaceholder('Nama sesuai buku tabungan').fill('Uji Test');
    await page.getByRole('button', { name: /^Lanjutkan/i }).click();
    await expect(page.getByText(/Nomor rekening harus berupa angka/i)).toBeVisible();
  });

  test('TC-01-06: Form registrasi UMKM lengkap 3 langkah & siap dikirim', async ({ page }) => {
    await page.goto('/register/umkm');
    // Langkah 1
    await isiLangkah1(page, `e2etest.umkm.${Date.now()}@gmail.com`);
    // Langkah 2: rekening valid -> lanjut ke Langkah 3
    await page.locator('select[name="nama_bank"]').selectOption('BCA');
    await page.getByPlaceholder('Contoh: 1234567890').fill('1234567890');
    await page.getByPlaceholder('Nama sesuai buku tabungan').fill('UMKM E2E');
    await page.getByRole('button', { name: /^Lanjutkan/i }).click();
    // Langkah 3: unggah NIB & NPWP (PDF in-memory)
    await expect(page.getByText(/Wajib Diisi/i)).toBeVisible();
    const pdf = { name: 'dok.pdf', mimeType: 'application/pdf', buffer: Buffer.from('e2e-pdf-dummy') };
    // Set NIB (input pertama); setelah terisi, input NIB hilang -> input tersisa = NPWP
    await page.locator('input[type="file"][accept="application/pdf"]').nth(0).setInputFiles(pdf);
    await page.locator('input[type="file"][accept="application/pdf"]').nth(0).setInputFiles(pdf);
    // Kedua dokumen terunggah -> tombol "Daftarkan Akun" aktif = form valid & siap dikirim.
    // (Submit signUp aktual membutuhkan "Confirm email" OFF di project Supabase test.)
    await expect(page.getByRole('button', { name: /Daftarkan Akun/i })).toBeEnabled();
  });
});
