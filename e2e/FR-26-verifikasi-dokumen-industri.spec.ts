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

test.describe.serial('FR-26: Verifikasi dokumen Industri', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let industriUserId: string;
  let industriEntityName: string;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Login sebagai akun verifikasi Industri khusus FR-26 (terpisah dari FR-25 & industrianon1)
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_VERIF_INDUSTRI_EMAIL!,
      password: process.env.E2E_VERIF_INDUSTRI_PASSWORD!,
    });
    industriUserId = authData.user!.id;
    
    const { data } = await supabase.from('users').select('nama').eq('id', industriUserId).single();
    industriEntityName = data!.nama;

    await supabase.auth.signOut();

    // Login admin on supabaseAdmin client (keep it logged in)
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });
  });

  test.beforeEach(async ({ page }) => {
    // Reset state to ensure clean start using admin client
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', industriUserId);
    await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'terverifikasi' }).eq('user_id', industriUserId);
    await supabaseAdmin.from('dokumen_legalitas').delete().eq('user_id', industriUserId);
  });

  test('TC-26-02: Dokumen tidak lengkap', async ({ page }) => {
    // Industri baru upload 2 dari 3 (SIUP dan NIB saja)
    await supabase.auth.signInWithPassword({
      email: process.env.E2E_VERIF_INDUSTRI_EMAIL!,
      password: process.env.E2E_VERIF_INDUSTRI_PASSWORD!,
    });
    await supabase.from('dokumen_legalitas').insert([
      { user_id: industriUserId, jenis_dokumen: 'SIUP', file_url: 'dummy_siup.pdf', status_verifikasi: 'menunggu' },
      { user_id: industriUserId, jenis_dokumen: 'NIB', file_url: 'dummy_nib.pdf', status_verifikasi: 'menunggu' }
    ]);
    await supabase.auth.signOut();
    await supabaseAdmin.from('users').update({ status_verifikasi: 'menunggu' }).eq('id', industriUserId);

    await login(page, 'Admin');
    await page.goto('/admin');

    const tableContainer = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-200.overflow-hidden');
    const userRow = tableContainer.locator('tr').filter({ hasText: industriEntityName }).first();
    await expect(userRow).toBeVisible();

    // Tombol Setuju harus disable karena dokumen tidak lengkap
    const btnSetuju = userRow.getByRole('button', { name: 'Setuju' });
    await expect(btnSetuju).toBeDisabled();
    
    // Verifikasi ada teks peringatan dokumen belum lengkap (2 Dokumen)
    await expect(userRow.getByText('2 Dokumen')).toBeVisible();
  });

  test('TC-26-03: Filter tab', async ({ page }) => {
    // Upload lengkap agar muncul di tabel
    await supabase.auth.signInWithPassword({
      email: process.env.E2E_VERIF_INDUSTRI_EMAIL!,
      password: process.env.E2E_VERIF_INDUSTRI_PASSWORD!,
    });
    await supabase.from('dokumen_legalitas').insert([
      { user_id: industriUserId, jenis_dokumen: 'SIUP', file_url: 'dummy_siup.pdf', status_verifikasi: 'menunggu' },
      { user_id: industriUserId, jenis_dokumen: 'NIB', file_url: 'dummy_nib.pdf', status_verifikasi: 'menunggu' },
      { user_id: industriUserId, jenis_dokumen: 'NPWP', file_url: 'dummy_npwp.pdf', status_verifikasi: 'menunggu' }
    ]);
    await supabase.auth.signOut();
    await supabaseAdmin.from('users').update({ status_verifikasi: 'menunggu' }).eq('id', industriUserId);

    await login(page, 'Admin');
    await page.goto('/admin');

    // Filter klik tab Industri
    await page.getByRole('button', { name: 'Industri Saja' }).click();

    const tableContainer = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-200.overflow-hidden');
    const userRow = tableContainer.locator('tr').filter({ hasText: industriEntityName }).first();
    await expect(userRow).toBeVisible();

    // Verifikasi type column says "Industri"
    await expect(userRow.getByText('Industri', { exact: true })).toBeVisible();
  });

  test('TC-26-01: Verifikasi Industri berhasil', async ({ page }) => {
    // Upload lengkap
    await supabase.auth.signInWithPassword({
      email: process.env.E2E_VERIF_INDUSTRI_EMAIL!,
      password: process.env.E2E_VERIF_INDUSTRI_PASSWORD!,
    });
    await supabase.from('dokumen_legalitas').insert([
      { user_id: industriUserId, jenis_dokumen: 'SIUP', file_url: 'dummy_siup.pdf', status_verifikasi: 'menunggu' },
      { user_id: industriUserId, jenis_dokumen: 'NIB', file_url: 'dummy_nib.pdf', status_verifikasi: 'menunggu' },
      { user_id: industriUserId, jenis_dokumen: 'NPWP', file_url: 'dummy_npwp.pdf', status_verifikasi: 'menunggu' }
    ]);
    await supabase.auth.signOut();
    await supabaseAdmin.from('users').update({ status_verifikasi: 'menunggu' }).eq('id', industriUserId);

    await login(page, 'Admin');
    await page.goto('/admin');

    const tableContainer = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-200.overflow-hidden');
    const userRow = tableContainer.locator('tr').filter({ hasText: industriEntityName }).first();
    await expect(userRow).toBeVisible();

    // Klik Setuju
    await userRow.getByRole('button', { name: 'Setuju' }).click();

    // Dialog Setuju Verifikasi
    const confirmModal = page.getByText('Setujui Verifikasi?');
    await expect(confirmModal).toBeVisible();

    // Klik Ya, Setujui
    await page.getByRole('button', { name: 'Ya, Setujui' }).click();

    // Tunggu toast sukses
    await expect(page.getByText('dokumen berhasil diverifikasi')).toBeVisible({ timeout: 10000 });

    // Verifikasi DB status dokumen
    const { data: docs } = await supabaseAdmin.from('dokumen_legalitas').select('status_verifikasi').eq('user_id', industriUserId);
    expect(docs?.every(d => d.status_verifikasi === 'terverifikasi')).toBeTruthy();

    // Verifikasi DB status user
    const { data: user } = await supabaseAdmin.from('users').select('status_verifikasi').eq('id', industriUserId).single();
    expect(user?.status_verifikasi).toBe('terverifikasi');
  });

});
