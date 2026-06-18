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

  test.describe('FR-11: Filter Pencarian Supplier', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, 'Industri');
      await page.goto('/pencarian', { waitUntil: 'domcontentloaded' });
      // Klik Filter Lanjutan untuk menampilkan panel filter
      const filterToggle = page.getByRole('button', { name: /Filter Lanjutan/i }).first();
      await filterToggle.click();
    });

    test('TC-11-05: Exception Case - Range Harga Terbalik (Min > Max)', async ({ page }) => {
      const minInput = page.getByPlaceholder('Min');
      const maxInput = page.getByPlaceholder('Max');
      const applyBtn = page.getByRole('button', { name: /Terapkan Filter/i });

      // Langkah 1: Input range harga tidak valid di mana Min > Max
      await minInput.fill('500000');
      await maxInput.fill('10000');

      // Langkah 2: Terapkan filter
      await applyBtn.click();

      // Langkah 3: Verifikasi URL ter-update
      await expect(page).toHaveURL(/minHarga=500000/);
      await expect(page).toHaveURL(/maxHarga=10000/);

      // Langkah 4: Harus menampilkan pesan bahwa tidak ada UMKM yang ditemukan karena filter tidak logis
      await expect(page.getByText(/Tidak ada UMKM ditemukan/i)).toBeVisible({ timeout: 10_000 });
    });

    test('TC-11-06: Filter berdasarkan Kategori (Valid)', async ({ page }) => {
      const categoryButton = page.locator('label:has-text("Jenis Usaha / Kategori") + div button').first();
      const applyBtn = page.getByRole('button', { name: /Terapkan Filter/i });

      if (await categoryButton.isVisible().catch(() => false)) {
        const categoryText = (await categoryButton.textContent())?.trim() || '';

        // Langkah 1: Klik kategori pertama yang tersedia
        await categoryButton.click();

        // Langkah 2: Terapkan filter
        await applyBtn.click();

        // Langkah 3: Verifikasi URL mengandung nama kategori (di-encode)
        await expect(page).toHaveURL(new RegExp(`kategori=${encodeURIComponent(categoryText).replace(/%20/g, '(%20|\\+)')}`));

        // Verifikasi semua UMKM yang tampil memiliki tag kategori yang sesuai
        const supplierCards = page.locator('div.group.relative.bg-white');
        const count = await supplierCards.count();
        for (let i = 0; i < count; i++) {
          const tag = supplierCards.nth(i).locator('span', { hasText: categoryText });
          await expect(tag).toBeVisible();
        }
      } else {
        test.skip(true, 'Tidak ada kategori yang tersedia untuk dipilih.');
      }
    });
  });

  test.afterAll(async () => {
    await clearCart();
  });
});
