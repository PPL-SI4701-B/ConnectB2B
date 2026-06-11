import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * FR-05: Kelola Profil
 * UMKM/Industri dapat membuka halaman profil dan melihat/ubah data.
 */
test.describe('FR-05: Kelola Profil', () => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  let umkmUserId: string;

  test.beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data: authData } = await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_UMKM_EMAIL!,
      password: process.env.E2E_UMKM_PASSWORD!,
    });
    umkmUserId = authData.user!.id;
    await supabaseAdmin.auth.signOut();
    
    // Login as Admin to get bypass RLS privileges for updates
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });
  });

  test.beforeEach(async ({ page }) => {
    // Pastikan status user terverifikasi agar tidak diarahkan ke /status-verifikasi
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
    await login(page, 'UMKM');
  });

  test.skip(!hasCreds('UMKM'), 'Kredensial UMKM belum diisi di .env.test');

  test('TC-05-01: Buka halaman Profil dari sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /^Profil$/i }).click();
    await expect(page).toHaveURL(/\/profil/);
  });

  test('TC-05-02: Halaman profil menampilkan data akun', async ({ page }) => {
    await page.goto('/profil');
    // Minimal ada input text yang bisa diedit pada form profil (bukan input file hidden)
    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 15_000 });
  });
});
