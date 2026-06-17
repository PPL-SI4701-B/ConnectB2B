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

test.describe.serial('FR-23: Upload dokumen UMKM', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkmUserId: string;

  let supabaseAdmin: ReturnType<typeof createClient>;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Login to Supabase as UMKM to get userId
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_DOC_UMKM_EMAIL!,
      password: process.env.E2E_DOC_UMKM_PASSWORD!,
    });
    umkmUserId = authData.user!.id;

    // Pastikan dokumen NIB dan NPWP ada
    const { data: existingDocs } = await supabase.from('dokumen_legalitas').select('jenis_dokumen').eq('user_id', umkmUserId);
    const hasNib = existingDocs?.some(d => d.jenis_dokumen === 'NIB');
    const hasNpwp = existingDocs?.some(d => d.jenis_dokumen === 'NPWP');

    if (!hasNib) {
      await supabase.from('dokumen_legalitas').insert({ user_id: umkmUserId, jenis_dokumen: 'NIB', file_url: 'dummy.pdf', status_verifikasi: 'terverifikasi' });
    }
    if (!hasNpwp) {
      await supabase.from('dokumen_legalitas').insert({ user_id: umkmUserId, jenis_dokumen: 'NPWP', file_url: 'dummy.pdf', status_verifikasi: 'terverifikasi' });
    }

    await supabase.auth.signOut();

    // Login as Admin to reset state (to bypass RLS on users table)
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });

    // Reset state to ensure clean start
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
    await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'terverifikasi' }).eq('user_id', umkmUserId);
  });

  test.beforeEach(async ({ page }) => {
    // Retry login and navigation to handle race conditions if FR-24 modifies the status concurrently
    await expect(async () => {
      await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
      
      await page.goto('/login');
      if (await page.getByRole('button', { name: /Masuk sebagai UMKM/i }).isVisible({ timeout: 2000 })) {
        await page.getByRole('button', { name: /Masuk sebagai UMKM/i }).click();
        await page.getByPlaceholder('nama@perusahaan.com').fill(process.env.E2E_DOC_UMKM_EMAIL!);
        await page.getByPlaceholder('Minimal 8 karakter').fill(process.env.E2E_DOC_UMKM_PASSWORD!);
        await page.getByRole('button', { name: /Lanjutkan Masuk/i }).click();
      }

      await expect(page).toHaveURL(/\/dashboard(?!-industri)/, { timeout: 5000 });
      await page.goto('/profil');
      await expect(page).toHaveURL(/\/profil/, { timeout: 5000 });
    }).toPass({ timeout: 35000, intervals: [1000, 2000] });
  });

  // Apa pun hasilnya, kembalikan akun UMKM ke 'terverifikasi' agar tidak merusak
  // test lain yang memakai akun yang sama.
  test.afterAll(async () => {
    if (supabaseAdmin && umkmUserId) {
      await supabaseAdmin.from('dokumen_legalitas')
        .update({ status_verifikasi: 'terverifikasi', catatan_admin: null }).eq('user_id', umkmUserId);
      await supabaseAdmin.from('users')
        .update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
    }
  });

  test('TC-23-01: Lihat status dokumen', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Kelola Profil Usaha' })).toBeVisible();
    await expect(page.getByText('Dokumen Pendukung Usaha')).toBeVisible();

    // NIB & NPWP tampil
    await expect(page.getByText('NIB')).toBeVisible();
    await expect(page.getByText('NPWP')).toBeVisible();
  });

  test('TC-23-02: Re-upload dokumen ditolak', async ({ page }) => {
    // 1. Setup data: set dokumen NIB menjadi ditolak
    await expect(async () => {
      const { data: nibDoc } = await supabaseAdmin
        .from('dokumen_legalitas')
        .select('id')
        .eq('user_id', umkmUserId)
        .eq('jenis_dokumen', 'NIB')
        .single();

      if (nibDoc) {
        await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'ditolak', catatan_admin: 'Tolong perbaiki NIB' }).eq('id', nibDoc.id);
      }

      // Set user status to ditolak as well, to trigger middleware redirect
      await supabaseAdmin.from('users').update({ status_verifikasi: 'ditolak' }).eq('id', umkmUserId);

      // Refresh page to trigger middleware redirect to /status-verifikasi?status=ditolak
      await page.reload();

      // Verify we are on status-verifikasi page and see rejection message
      await expect(page.getByText('Verifikasi Dokumen Ditolak')).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 15000, intervals: [1000, 2000] });

    // LOG DB STATE
    const { data: checkDocs } = await supabaseAdmin.from('dokumen_legalitas').select('*').eq('user_id', umkmUserId);
    console.log("Docs in DB for user:", checkDocs);

    // Click 'Upload Ulang Dokumen'
    await page.getByRole('link', { name: 'Upload Ulang Dokumen' }).click();

    // Verify we are on /re-upload
    await expect(page.getByRole('heading', { name: /Upload Ulang Dokumen/i })).toBeVisible();

    // Find file input and upload
    const fileInput = page.locator('input[type="file"][accept="application/pdf"]').first();
    await fileInput.setInputFiles(path.resolve(__dirname, 'dummy_nib.pdf'));

    // Click Upload Ulang button
    await page.getByRole('button', { name: /Upload Ulang/i }).click();

    // Toast sukses muncul
    await expect(page.getByText('Dokumen berhasil diunggah ulang!')).toBeVisible({ timeout: 15000 });
    // Verifikasi via DB bahwa status user kembali ke 'menunggu' (re-upload berhasil).
    // Lebih andal daripada menunggu auto-redirect klien 3 detik yang flaky.
    await expect(async () => {
      const { data: u } = await supabaseAdmin.from('users').select('status_verifikasi').eq('id', umkmUserId).single();
      expect(u?.status_verifikasi).toBe('menunggu');
    }).toPass({ timeout: 15000, intervals: [1000, 2000] });

    // Reset status to terverifikasi so the next test's beforeEach login() doesn't fail
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
  });

  test('TC-23-03: Dokumen semua terverifikasi', async ({ page }) => {
    await expect(async () => {
      // Set semua dokumen menjadi terverifikasi
      await supabaseAdmin.from('dokumen_legalitas')
        .update({ status_verifikasi: 'terverifikasi' })
        .eq('user_id', umkmUserId);
        
      await supabaseAdmin.from('users')
        .update({ status_verifikasi: 'terverifikasi' })
        .eq('id', umkmUserId);

      await page.goto('/profil');

      // Cek badge
      await expect(page.getByText('Status: Berkas Lengkap & Terverifikasi')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Dokumen Anda telah diperiksa dan disetujui')).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 15000, intervals: [1000, 2000] });
  });

  test.afterAll(async () => {
    // Pastikan user kembali terverifikasi agar tidak mengganggu test lain
    await supabaseAdmin.from('dokumen_legalitas')
      .update({ status_verifikasi: 'terverifikasi' })
      .eq('user_id', umkmUserId);
      
    await supabaseAdmin.from('users')
      .update({ status_verifikasi: 'terverifikasi' })
      .eq('id', umkmUserId);
  });
});
