import { test, expect } from '@playwright/test';
import { login, dashboardPath } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-21: Manajemen Akun (Admin)', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  
  // Gunakan user umkmanon2 yang memang sudah disediakan khusus untuk E2E testing
  // Jika tidak ada, fallback ke umkmanon1
  let targetUserEmail = '';
  let targetUserName = '';

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    // Kita cari umkmanon2 di database
    const { data } = await supabase.from('users').select('email, nama').eq('nama', 'umkmanon2').single();
    if (data) {
      targetUserEmail = data.email;
      targetUserName = data.nama;
    } else {
      // Fallback
      targetUserEmail = process.env.E2E_UMKM_EMAIL!;
      targetUserName = 'umkmanon1';
    }
  });

  test.beforeEach(async ({ page }) => {
    // Selalu terima dialog konfirmasi
    page.on('dialog', dialog => dialog.accept());
    await login(page, 'Admin');
    await expect(page).toHaveURL(dashboardPath('Admin'), { timeout: 15000 });
  });

  test('TC-21-03: List pengguna', async ({ page }) => {
    // Pastikan tabel manajemen pengguna terlihat
    await expect(page.getByRole('heading', { name: 'Manajemen Pengguna' })).toBeVisible();

    // Search target user
    const searchInput = page.getByPlaceholder('Cari nama, email, atau role...');
    await searchInput.fill(targetUserEmail);
    
    // Tunggu render
    await page.waitForTimeout(1000);

    // Pastikan user tersebut muncul
    await expect(page.getByText(targetUserEmail)).toBeVisible();
  });

  test('TC-21-01: Blokir akun', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Cari nama, email, atau role...');
    await searchInput.fill(targetUserEmail);
    await page.waitForTimeout(1000);

    const userRow = page.locator('tr').filter({ hasText: targetUserEmail }).first();
    await expect(userRow).toBeVisible();

    // Jika sudah terblokir karena tes sebelumnya gagal, unblokir dulu
    const isBlocked = await userRow.getByRole('button', { name: 'Buka Blokir' }).isVisible().catch(() => false);
    if (isBlocked) {
       await userRow.getByRole('button', { name: 'Buka Blokir' }).click();
       await expect(userRow.getByText('Aktif', { exact: true })).toBeVisible({ timeout: 10000 });
    }

    // Pastikan status awalnya Aktif
    await expect(userRow.getByText('Aktif', { exact: true })).toBeVisible();

    // Klik tombol Blokir
    await userRow.getByRole('button', { name: 'Blokir' }).click();

    // Pastikan status berubah jadi Diblokir
    await expect(userRow.getByText('Diblokir', { exact: true })).toBeVisible();
  });

  test('TC-21-02: Unblokir akun', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Cari nama, email, atau role...');
    await searchInput.fill(targetUserEmail);
    await page.waitForTimeout(1000);

    const userRow = page.locator('tr').filter({ hasText: targetUserEmail }).first();
    await expect(userRow).toBeVisible();

    // Pastikan statusnya Diblokir
    await expect(userRow.getByText('Diblokir', { exact: true })).toBeVisible();

    // Klik tombol Buka Blokir
    await userRow.getByRole('button', { name: 'Buka Blokir' }).click();

    // Pastikan status berubah jadi Aktif
    await expect(userRow.getByText('Aktif', { exact: true })).toBeVisible();
  });
});
