import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * FR-11: Keranjang Kolaborasi (Industri)
 * Industri membuka keranjang & menambahkan item dari katalog.
 * Aturan bisnis: keranjang hanya boleh berisi item dari satu UMKM.
 */
test.describe('FR-11: Keranjang Kolaborasi', () => {
  test.skip(!hasCreds('Industri'), 'Kredensial Industri belum diisi di .env.test');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabaseAdmin: ReturnType<typeof createClient>;
  let industriId: number | null = null;

  test.beforeAll(async () => {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });
    const { data: indUser } = await supabaseAdmin.from('users').select('id').eq('email', process.env.E2E_INDUSTRI_EMAIL!).single();
    if (indUser) {
      const { data: ind } = await supabaseAdmin.from('industri').select('id').eq('user_id', (indUser as any).id).single();
      industriId = ind ? (ind as any).id : null;
    }
  });

  // Kosongkan keranjang Industri agar test deterministik (tidak terpengaruh sisa run lain)
  async function clearCart() {
    if (industriId) {
      await supabaseAdmin.from('keranjang').delete().eq('industri_id', industriId);
    }
  }

  test('TC-11-01: Buka Keranjang dari sidebar', async ({ page }) => {
    await login(page, 'Industri');
    await page.getByRole('link', { name: /Keranjang Kolaborasi/i }).click();
    await expect(page).toHaveURL(/\/keranjang/);
    await expect(page.getByRole('heading', { name: /Keranjang Kolaborasi/i })).toBeVisible();
  });

  test('TC-11-02: Menampilkan daftar item atau pesan keranjang kosong', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/keranjang', { waitUntil: 'domcontentloaded' });
    const kosong = page.getByText(/Keranjang Anda Kosong/i);
    const checkout = page.getByRole('button', { name: /Review & Ajukan Request/i });
    await expect(kosong.or(checkout).first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-11-03: Keranjang kosong menampilkan pesan kosong', async ({ page }) => {
    await clearCart();
    await login(page, 'Industri');
    await page.goto('/keranjang', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Keranjang Anda Kosong/i)).toBeVisible({ timeout: 15_000 });
  });

  test('TC-11-04: Tambah item ke keranjang dari detail produk', async ({ page }) => {
    await clearCart();
    await login(page, 'Industri');

    // Buka katalog publik & klik produk pertama
    await page.goto('/katalog-publik', { waitUntil: 'domcontentloaded' });
    const productCards = page.locator('a[href^="/katalog-publik/"]');
    if (await productCards.count() === 0) {
      test.skip(true, 'Tidak ada produk di database untuk dites.');
    }
    await productCards.first().click();
    await expect(page).toHaveURL(/\/katalog-publik\/\d+/);

    // Klik "Ajukan Kerjasama" -> item masuk keranjang -> diarahkan ke /keranjang
    await page.getByRole('button', { name: /Ajukan Kerjasama/i }).click();
    await expect(page).toHaveURL(/\/keranjang/, { timeout: 15_000 });

    // Keranjang TIDAK kosong: tombol checkout tampil & pesan "kosong" tidak ada
    await expect(page.getByRole('button', { name: /Review & Ajukan Request/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Keranjang Anda Kosong/i)).toHaveCount(0);
  });

  test.afterAll(async () => {
    await clearCart();
  });
});
