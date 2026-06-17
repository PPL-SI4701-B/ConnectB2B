import { test, expect } from '@playwright/test';
import { login, dashboardPath } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Muat dari .env.test (berisi SUPABASE key + kredensial test)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback ke .env.local jika ada override
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-24: Verifikasi dokumen UMKM', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let umkmUserId: string;
  let umkmEntityName: string;

  // Akun khusus FR-24 yang sudah di-seed (hindari signUp yang kena email rate limit project test)
  let tempEmail = 'fr24-umkm@gmail.com';
  let tempPassword = '12345678';

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Login admin on supabaseAdmin client (keep it logged in) untuk query & reset state
    await supabaseAdmin.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });

    // Ambil id akun seed FR-24
    const { data: u } = await supabaseAdmin.from('users').select('id').eq('email', tempEmail).single();
    if (!u) throw new Error(`Akun seed FR-24 (${tempEmail}) tidak ditemukan. Jalankan supabase/seed.sql.`);
    umkmUserId = u.id as string;
    umkmEntityName = 'PT Dummy 24';
  });

  test.beforeEach(async ({ page }) => {
    // Reset state to ensure clean start using admin client
    await supabaseAdmin.from('users').update({ status_verifikasi: 'terverifikasi' }).eq('id', umkmUserId);
    await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'terverifikasi' }).eq('user_id', umkmUserId);

    // Set dokumen ke menunggu (bersihkan yang ada lalu insert baru)
    await supabaseAdmin.from('dokumen_legalitas').delete().eq('user_id', umkmUserId);
    
    // Login as UMKM to insert (bypass RLS which blocks admin insert)
    await supabase.auth.signInWithPassword({
      email: tempEmail,
      password: tempPassword,
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
    await expect(async () => {
      // Reset to menunggu so it shows up in table
      await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'menunggu' }).eq('user_id', umkmUserId);
      await page.reload();

      // Cari baris user umkmanon1
      const tableContainer = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-200.overflow-hidden');
      const userRow = tableContainer.locator('tr').filter({ hasText: umkmEntityName }).first();
      await expect(userRow).toBeVisible({ timeout: 5000 });
      await userRow.getByRole('button', { name: 'Tolak Izin' }).click();

      // Dialog Tolak Verifikasi muncul
      const rejectModal = page.getByText('Tolak Verifikasi');
      await expect(rejectModal).toBeVisible({ timeout: 5000 });

      // Isi alasan penolakan
      await page.getByPlaceholder('Beri tahu pengguna mengapa dokumen ini ditolak').fill('Dokumen tidak dapat terbaca dengan jelas.');

      // Kirim Penolakan
      await page.getByRole('button', { name: 'Kirim Penolakan' }).click();

      // Tunggu toast sukses
      await expect(page.getByText('dokumen berhasil ditolak')).toBeVisible({ timeout: 10000 });

      // Verifikasi DB
      const { data: docs } = await supabaseAdmin.from('dokumen_legalitas').select('status_verifikasi').eq('user_id', umkmUserId);
      expect(docs?.every(d => d.status_verifikasi === 'ditolak')).toBeTruthy();
    }).toPass({ timeout: 15000, intervals: [1000, 2000] });
  });

  test('TC-24-01 & TC-24-03: Setuju dokumen dan verifikasi status', async ({ page }) => {
    await expect(async () => {
      // Pastikan dokumen menunggu
      await supabaseAdmin.from('dokumen_legalitas').update({ status_verifikasi: 'menunggu' }).eq('user_id', umkmUserId);
      await page.reload();

      const tableContainer = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-200.overflow-hidden');
      const userRow = tableContainer.locator('tr').filter({ hasText: umkmEntityName }).first();
      await expect(userRow).toBeVisible({ timeout: 5000 });

      // Klik Setuju
      await userRow.getByRole('button', { name: 'Setuju' }).click();

      // Dialog Setuju Verifikasi
      const confirmModal = page.getByText('Setujui Verifikasi?');
      await expect(confirmModal).toBeVisible({ timeout: 5000 });

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
    }).toPass({ timeout: 15000, intervals: [1000, 2000] });
  });
});
