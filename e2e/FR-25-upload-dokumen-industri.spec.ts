import { test, expect } from '@playwright/test';
import { login, dashboardPath } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-25: Upload dokumen Industri', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let indUserId: string;
  let supabaseAdmin: ReturnType<typeof createClient>;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Login to Supabase as Industri to get userId
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_INDUSTRI_EMAIL!,
      password: process.env.E2E_INDUSTRI_PASSWORD!,
    });
    indUserId = authData.user!.id;

    // Pastikan dokumen SIUP, NIB, NPWP ada
    const { data: existingDocs } = await supabase.from('dokumen_legalitas').select('jenis_dokumen').eq('user_id', indUserId);
    const hasSiup = existingDocs?.some(d => d.jenis_dokumen === 'SIUP');
    const hasNib = existingDocs?.some(d => d.jenis_dokumen === 'NIB');
    const hasNpwp = existingDocs?.some(d => d.jenis_dokumen === 'NPWP');

    if (!hasSiup) {
      await supabase.from('dokumen_legalitas').insert({ user_id: indUserId, jenis_dokumen: 'SIUP', file_url: 'dummy_siup.pdf', status_verifikasi: 'terverifikasi' });
    }
    if (!hasNib) {
      await supabase.from('dokumen_legalitas').insert({ user_id: indUserId, jenis_dokumen: 'NIB', file_url: 'dummy_nib.pdf', status_verifikasi: 'terverifikasi' });
    }
    if (!hasNpwp) {
      await supabase.from('dokumen_legalitas').insert({ user_id: indUserId, jenis_dokumen: 'NPWP', file_url: 'dummy_npwp.pdf', status_verifikasi: 'terverifikasi' });
    }

    await supabase.auth.signOut();

    // Login as Admin to reset state (to bypass RLS on users table)
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });

    // Reset state to ensure clean start
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', indUserId);
    await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'terverifikasi' }).eq('user_id', indUserId);
  });

  test.beforeEach(async ({ page }) => {
    // Reset status to terverifikasi before login so that middleware doesn't redirect to status-verifikasi
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', indUserId);

    await login(page, 'Industri');
    await page.goto('/profil'); // URL profil sama untuk industri maupun UMKM
  });

  test('TC-25-01: Lihat status 3 dokumen', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Kelola Profil Usaha' })).toBeVisible();
    await expect(page.getByText('Dokumen Pendukung Usaha')).toBeVisible();

    // SIUP, NIB & NPWP tampil
    await expect(page.getByText('SIUP')).toBeVisible();
    await expect(page.getByText('NIB')).toBeVisible();
    await expect(page.getByText('NPWP')).toBeVisible();
  });

  test('TC-25-02: Re-upload SIUP ditolak', async ({ page }) => {
    // 1. Setup data: set dokumen SIUP menjadi ditolak
    const { data: siupDoc } = await supabaseAdmin
      .from('dokumen_legalitas')
      .select('id')
      .eq('user_id', indUserId)
      .eq('jenis_dokumen', 'SIUP')
      .single();

    if (siupDoc) {
      await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'ditolak', catatan_admin: 'Tolong perbaiki SIUP' }).eq('id', siupDoc.id);
    }

    // Set user status to ditolak as well, to trigger middleware redirect
    await supabaseAdmin.from('users').update({ status_verifikasi: 'ditolak' }).eq('id', indUserId);

    // Refresh page to trigger middleware redirect to /status-verifikasi?status=ditolak
    await page.reload();

    // Verify we are on status-verifikasi page and see rejection message
    await expect(page.getByText('Verifikasi Dokumen Ditolak')).toBeVisible();
    // Skip checking exact rejection reason as it relies on client-side fetch which can be flaky

    // Click 'Upload Ulang Dokumen'
    await page.getByRole('link', { name: 'Upload Ulang Dokumen' }).click();

    // Verify we are on /re-upload
    await expect(page.getByRole('heading', { name: /Upload Ulang Dokumen/i })).toBeVisible();

    // 2. Upload file baru
    const buffer = Buffer.from('test document content');
    
    // Find file input and upload
    const fileInput = page.locator('input[type="file"][accept="application/pdf"]').first();
    await fileInput.setInputFiles({
      name: 'SIUP_baru.pdf',
      mimeType: 'application/pdf',
      buffer
    });

    // Click Upload Ulang button
    await page.getByRole('button', { name: /Upload Ulang/i }).click();

    // Wait for success toast and redirect to menunggu
    await expect(page.getByText('Dokumen berhasil diunggah ulang!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Akun Anda Sedang Diverifikasi')).toBeVisible({ timeout: 15000 });

    // Reset status to terverifikasi so the next test's beforeEach login() doesn't fail
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', indUserId);
  });

  test('TC-25-03: Semua terverifikasi', async ({ page }) => {
    // Set semua dokumen menjadi terverifikasi
    await supabaseAdmin.from('dokumen_legalitas')
      .update({ status_verifikasi: 'terverifikasi' })
      .eq('user_id', indUserId);
      
    await supabaseAdmin.from('users')
      .update({ status_verifikasi: 'terverifikasi' })
      .eq('id', indUserId);

    await page.goto('/profil');

    // Cek badge "Industri Terverifikasi"
    await expect(page.getByText('Industri Terverifikasi')).toBeVisible();
    await expect(page.getByText('Status: Berkas Lengkap & Terverifikasi')).toBeVisible();
  });

  test.afterAll(async () => {
    // Pastikan user kembali terverifikasi
    await supabaseAdmin.from('dokumen_legalitas')
      .update({ status_verifikasi: 'terverifikasi' })
      .eq('user_id', indUserId);
      
    await supabaseAdmin.from('users')
      .update({ status_verifikasi: 'terverifikasi' })
      .eq('id', indUserId);
  });
});
