import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Muat dari .env.test (berisi SUPABASE key + kredensial test)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback ke .env.local jika ada override
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-27: Status verifikasi', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let umkmUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Login sebagai akun STATUS khusus FR-27 (terpisah dari umkmanon1 agar tidak mengotori test lain)
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_STATUS_UMKM_EMAIL!,
      password: process.env.E2E_STATUS_UMKM_PASSWORD!,
    });
    umkmUserId = authData.user!.id;

    // Pastikan ada minimal 1 dokumen (untuk uji catatan penolakan); insert sebagai akun sendiri (lolos RLS)
    const { data: existing } = await supabase.from('dokumen_legalitas').select('id').eq('user_id', umkmUserId).limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from('dokumen_legalitas').insert({ user_id: umkmUserId, jenis_dokumen: 'NIB', file_url: 'dummy.pdf', status_verifikasi: 'terverifikasi' });
    }

    await supabase.auth.signOut();

    // Login admin on supabaseAdmin client (keep it logged in)
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });
  });

  test.beforeEach(async ({ page }) => {
    // Reset state ke kondisi bersih (dokumen & user terverifikasi)
    await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'terverifikasi', catatan_admin: null }).eq('user_id', umkmUserId);
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);

    // Login GUI sebagai akun status FR-27
    await page.goto('/login');
    await page.getByRole('button', { name: /Masuk sebagai UMKM/i }).click();
    await page.getByPlaceholder('nama@perusahaan.com').fill(process.env.E2E_STATUS_UMKM_EMAIL!);
    await page.getByPlaceholder('Minimal 8 karakter').fill(process.env.E2E_STATUS_UMKM_PASSWORD!);
    await page.getByRole('button', { name: /Lanjutkan Masuk/i }).click();
    await expect(page).toHaveURL(/\/dashboard(?!-industri)/, { timeout: 20_000 });
  });

  test('TC-27-01: Badge terverifikasi', async ({ page }) => {
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
    
    // Pergi ke halaman profil
    await page.goto('/profil');

    // Pastikan tampil tulisan UMKM Terverifikasi
    await expect(page.getByText('UMKM Terverifikasi')).toBeVisible();
    await expect(page.getByText('Status: Berkas Lengkap & Terverifikasi')).toBeVisible();
  });

  test('TC-27-02: Badge menunggu', async ({ page }) => {
    // Update ke status menunggu
    await supabaseAdmin.from('users').update({ status_verifikasi: 'menunggu' }).eq('id', umkmUserId);

    // Pergi ke halaman profil. Karena menunggu, middleware akan redirect ke /status-verifikasi
    await page.goto('/profil');
    await page.waitForURL(/\/status-verifikasi/);

    // Pastikan tampil elemen badge kuning (tulisan menunggu)
    await expect(page.getByText('Akun Anda Sedang Diverifikasi')).toBeVisible();
  });

  test('TC-27-03: Badge ditolak + alasan', async ({ page }) => {
    // Beri catatan admin di dokumen
    const { data: docs } = await supabaseAdmin.from('dokumen_legalitas').select('id').eq('user_id', umkmUserId).limit(1);
    if (docs && docs.length > 0) {
      await supabaseAdmin.from('dokumen_legalitas')
        .update({ status_verifikasi: 'ditolak', catatan_admin: 'Dokumen terlalu buram' })
        .eq('id', docs[0].id);
    } else {
      // Insert if empty
      await supabaseAdmin.from('dokumen_legalitas')
        .insert({ user_id: umkmUserId, jenis_dokumen: 'NIB', file_url: 'dummy.pdf', status_verifikasi: 'ditolak', catatan_admin: 'Dokumen terlalu buram' });
    }

    // Update status user
    await supabaseAdmin.from('users').update({ status_verifikasi: 'ditolak' }).eq('id', umkmUserId);

    // Pergi ke halaman profil -> Redirect ke status-verifikasi
    await page.goto('/profil');
    await page.waitForURL(/\/status-verifikasi/);

    // Pastikan tampil elemen badge merah (ditolak) dan alasan
    await expect(page.getByText('Verifikasi Dokumen Ditolak')).toBeVisible();
    await expect(page.getByText('Catatan Penolakan:')).toBeVisible();
    await expect(page.getByText('Dokumen terlalu buram')).toBeVisible();
  });

});
