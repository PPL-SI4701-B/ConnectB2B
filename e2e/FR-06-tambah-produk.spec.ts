import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * FR-06: Tambah Produk (UMKM)
 * UMKM membuka Katalog -> "Tambah Item Baru" -> form -> simpan produk.
 */
test.describe('FR-06: Tambah Produk', () => {
  test.skip(!hasCreds('UMKM'), 'Kredensial UMKM belum diisi di .env.test');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabaseAdmin: ReturnType<typeof createClient>;

  let umkmUserId: string | null = null;

  test.beforeAll(async () => {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });
    const { data } = await supabaseAdmin.from('users').select('id').eq('email', process.env.E2E_UMKM_EMAIL!).single();
    umkmUserId = data ? (data as any).id : null;
  });

  // Pastikan akun UMKM terverifikasi agar halaman tambah produk tidak diblokir
  test.beforeEach(async () => {
    if (umkmUserId) {
      await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
    }
  });

  // Bersihkan produk hasil test agar tidak menumpuk
  test.afterAll(async () => {
    if (supabaseAdmin) {
      await supabaseAdmin.from('produk').delete().like('nama', 'E2E_FR06_%');
    }
  });

  test('TC-06-01: Buka halaman Katalog Produk dari sidebar', async ({ page }) => {
    await login(page, 'UMKM');
    // Klik link sidebar; ulangi bila navigasi pertama belum terpicu (race hidrasi)
    await expect(async () => {
      await page.getByRole('link', { name: /Katalog Produk/i }).click();
      await expect(page).toHaveURL(/\/dashboard\/katalog/, { timeout: 5_000 });
    }).toPass({ timeout: 20_000, intervals: [500, 1000] });
    await expect(page.getByRole('heading', { name: /Katalog & Aset Saya/i })).toBeVisible();
  });

  test('TC-06-02: Tombol "Tambah Item Baru" menuju form tambah produk', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/dashboard/katalog', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /Tambah Item Baru/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/katalog\/tambah/);
  });

  test('TC-06-03: Form tambah produk menampilkan field nama & harga', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/dashboard/katalog/tambah');
    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-06-04: Validasi wajib unggah foto produk', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/dashboard/katalog/tambah');
    // Isi semua field wajib KECUALI foto
    await page.getByPlaceholder('Contoh: Maklon Kemeja Drill').fill('Produk Tanpa Foto');
    await page.locator('select').first().selectOption({ label: 'Tekstil' });
    await page.getByPlaceholder('150000').fill('50000');
    // Submit tanpa foto -> muncul error validasi
    await page.getByRole('button', { name: /Simpan ke Portofolio/i }).click();
    await expect(page.getByText(/Minimal 1 foto wajib diunggah/i)).toBeVisible();
  });

  test('TC-06-05: Tambah produk berhasil tersimpan', async ({ page }) => {
    const namaProduk = `E2E_FR06_${Date.now()}`;
    await login(page, 'UMKM');
    await page.goto('/dashboard/katalog/tambah');

    // Unggah foto (wajib) — pakai gambar dummy in-memory (tidak bergantung file fisik)
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'foto-produk.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('e2e-dummy-image-content'),
    });
    // Isi form
    await page.getByPlaceholder('Contoh: Maklon Kemeja Drill').fill(namaProduk);
    await page.locator('select').first().selectOption({ label: 'Tekstil' });
    await page.getByPlaceholder('150000').fill('77000');
    // Simpan
    await page.getByRole('button', { name: /Simpan ke Portofolio/i }).click();

    // Redirect kembali ke katalog (bukan /tambah)
    await expect(page).toHaveURL(/\/dashboard\/katalog(?!\/tambah)/, { timeout: 20_000 });

    // Verifikasi produk benar-benar tersimpan di DB
    await expect(async () => {
      const { data } = await supabaseAdmin.from('produk').select('nama, harga').eq('nama', namaProduk).maybeSingle();
      expect(data).not.toBeNull();
      expect(Number((data as any)!.harga)).toBe(77000);
    }).toPass({ timeout: 10_000, intervals: [1000, 2000] });
  });
});
