import { test, expect } from '@playwright/test';
import { login, dashboardPath } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Muat dari .env.test (berisi SUPABASE key + kredensial test)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback ke .env.local jika ada override
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-21: Manajemen Akun (Admin)', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  
  // Akun KHUSUS untuk test blokir — TIDAK BOLEH sama dengan akun yang dipakai test lain.
  // Diambil dari .env.test (E2E_BLOCK_TARGET_EMAIL). Tidak ada fallback ke umkmanon1
  // supaya memblokir akun ini tidak pernah merusak test lain.
  const targetUserEmail = process.env.E2E_BLOCK_TARGET_EMAIL || 'umkmanon2@gmail.com';

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    // Login sebagai admin agar bisa baca/tulis tabel users (lewati RLS)
    await supabase.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });
    // Pastikan akun target dalam keadaan AKTIF sebelum test mulai (bersihkan sisa run yang gagal)
    await supabase.from('users').update({ is_blocked: false }).eq('email', targetUserEmail);
  });

  // Apa pun yang terjadi (sukses/gagal), kembalikan akun target ke keadaan AKTIF
  // supaya tidak meninggalkan akun terblokir untuk run/orang berikutnya.
  test.afterAll(async () => {
    if (supabase) {
      await supabase.from('users').update({ is_blocked: false }).eq('email', targetUserEmail);
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
