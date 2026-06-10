import { test, expect } from '@playwright/test';
import { login, dashboardPath } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-24: Verifikasi dokumen UMKM', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let umkmUserId: string;
  let umkmEntityName: string;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Login to Supabase as UMKM to get userId
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_UMKM_EMAIL!,
      password: process.env.E2E_UMKM_PASSWORD!,
    });
    umkmUserId = authData.user!.id;
    
    const { data } = await supabase.from('users').select('nama').eq('id', umkmUserId).single();
    umkmEntityName = data!.nama;

    await supabase.auth.signOut();

    // Login admin on supabaseAdmin client (keep it logged in)
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });
  });

  test.beforeEach(async ({ page }) => {
    // Reset state to ensure clean start using admin client
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
    await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'terverifikasi' }).eq('user_id', umkmUserId);

    // Set dokumen ke menunggu
    await supabaseAdmin.from('dokumen_legalitas').delete().eq('user_id', umkmUserId);
    
    // Login as UMKM to insert (bypass RLS which blocks admin insert)
    await supabase.auth.signInWithPassword({
      email: process.env.E2E_UMKM_EMAIL!,
      password: process.env.E2E_UMKM_PASSWORD!,
    });
    await supabase.from('dokumen_legalitas').insert([
      { user_id: umkmUserId, jenis_dokumen: 'NIB', file_url: 'dummy_nib.pdf', status_verifikasi: 'menunggu' },
      { user_id: umkmUserId, jenis_dokumen: 'NPWP', file_url: 'dummy_npwp.pdf', status_verifikasi: 'menunggu' }
    ]);
    await supabase.auth.signOut();
    await supabaseAdmin.from('users').update({ status_verifikasi: 'menunggu' }).eq('id', umkmUserId);

    await login(page, 'Admin');
    await page.goto('/admin');
  });

  test('TC-24-02: Tolak dokumen', async ({ page }) => {
    // Reset to menunggu so it shows up in table
    await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'menunggu' }).eq('user_id', umkmUserId);
    await page.reload();

    // Cari baris user umkmanon1
    const tableContainer = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-200.overflow-hidden');
    const userRow = tableContainer.locator('tr').filter({ hasText: umkmEntityName }).first();
    await expect(userRow).toBeVisible();
    await userRow.getByRole('button', { name: 'Tolak Izin' }).click();

    // Dialog Tolak Verifikasi muncul
    const rejectModal = page.getByText('Tolak Verifikasi');
    await expect(rejectModal).toBeVisible();

    // Isi alasan penolakan
    await page.getByPlaceholder('Beri tahu pengguna mengapa dokumen ini ditolak').fill('Dokumen tidak dapat terbaca dengan jelas.');

    // Kirim Penolakan
    await page.getByRole('button', { name: 'Kirim Penolakan' }).click();

    // Tunggu toast sukses
    await expect(page.getByText('dokumen berhasil ditolak')).toBeVisible({ timeout: 10000 });

    // Verifikasi DB
    const { data: docs } = await supabaseAdmin.from('dokumen_legalitas').select('status_verifikasi').eq('user_id', umkmUserId);
    expect(docs?.every(d => d.status_verifikasi === 'ditolak')).toBeTruthy();
  });

  test('TC-24-01 & TC-24-03: Setuju dokumen dan verifikasi status', async ({ page }) => {
    // Pastikan dokumen menunggu
    await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'menunggu' }).eq('user_id', umkmUserId);
    await page.reload();

    const tableContainer = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-200.overflow-hidden');
    const userRow = tableContainer.locator('tr').filter({ hasText: umkmEntityName }).first();
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
    const { data: docs } = await supabaseAdmin.from('dokumen_legalitas').select('status_verifikasi').eq('user_id', umkmUserId);
    expect(docs?.every(d => d.status_verifikasi === 'terverifikasi')).toBeTruthy();

    // Verifikasi DB status user (TC-24-03)
    const { data: user } = await supabaseAdmin.from('users').select('status_verifikasi').eq('id', umkmUserId).single();
    expect(user?.status_verifikasi).toBe('terverifikasi');
  });
});
