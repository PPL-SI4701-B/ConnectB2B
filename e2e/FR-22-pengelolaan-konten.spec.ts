import { test, expect } from '@playwright/test';
import { login, dashboardPath } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-22: Pengelolaan Konten (Admin)', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  
  const uniqueTag = Date.now().toString();
  const testProductName = `Produk FR22 ${uniqueTag}`;
  let testProductId: number;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    // Sign in as UMKM to bypass RLS when creating product
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_UMKM_EMAIL!,
      password: process.env.E2E_UMKM_PASSWORD!,
    });
    if (authErr) throw authErr;

    // Insert a dummy product under UMKM's ownership
    const { data: produk, error } = await supabase.from('produk').insert({
      user_id: authData.user!.id,
      nama: testProductName,
      deskripsi: 'Deskripsi dummy',
      kategori: 'Jasa',
      harga: 10000,
      is_active: true
    }).select('id').single();
    
    if (error) throw error;
    testProductId = produk!.id;
  });

  test.beforeEach(async ({ page }) => {
    // Selalu terima dialog konfirmasi
    page.on('dialog', dialog => dialog.accept());
    await login(page, 'Admin');
    await expect(page).toHaveURL(dashboardPath('Admin'), { timeout: 15000 });
  });

  test('TC-22-01: Hapus konten (Nonaktifkan)', async ({ page }) => {
    // Pastikan tabel moderasi konten terlihat
    await expect(page.getByRole('heading', { name: 'Moderasi Konten Produk' })).toBeVisible();

    // Search dummy product
    const searchInput = page.getByPlaceholder('Cari nama produk, UMKM, atau kategori...');
    await searchInput.fill(testProductName);
    await page.waitForTimeout(1000);

    const productRow = page.locator('tr').filter({ hasText: testProductName }).first();
    await expect(productRow).toBeVisible();

    // Pastikan status awalnya Aktif
    await expect(productRow.getByText('Aktif', { exact: true })).toBeVisible();

    // Klik tombol Nonaktifkan
    await productRow.getByRole('button', { name: 'Nonaktifkan' }).click();

    // Pastikan status berubah jadi Nonaktif
    await expect(productRow.getByText('Nonaktif', { exact: true })).toBeVisible();
  });

  test('TC-22-02: Abaikan laporan (Aktifkan konten)', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Cari nama produk, UMKM, atau kategori...');
    await searchInput.fill(testProductName);
    await page.waitForTimeout(1000);

    const productRow = page.locator('tr').filter({ hasText: testProductName }).first();
    await expect(productRow).toBeVisible();

    // Pastikan statusnya Nonaktif
    await expect(productRow.getByText('Nonaktif', { exact: true })).toBeVisible();

    // Klik tombol Aktifkan (Abaikan laporan dan membiarkan produk tayang)
    await productRow.getByRole('button', { name: 'Aktifkan' }).click();

    // Pastikan status berubah jadi Aktif
    await expect(productRow.getByText('Aktif', { exact: true })).toBeVisible();
  });

  test.afterAll(async () => {
    // Hapus data dummy product
    // Kita harus login lagi karena token mungkin expire, tapi karena cuma afterAll gpp
    await supabase.auth.signInWithPassword({
      email: process.env.E2E_UMKM_EMAIL!,
      password: process.env.E2E_UMKM_PASSWORD!,
    });
    await supabase.from('produk').delete().eq('id', testProductId);
  });
});
