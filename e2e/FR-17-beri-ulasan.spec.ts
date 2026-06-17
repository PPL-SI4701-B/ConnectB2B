import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Muat dari .env.test (berisi SUPABASE key + kredensial test)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback ke .env.local jika ada override
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-17: Beri Ulasan (Industri)', () => {
  test.skip(!hasCreds('Industri') || !hasCreds('Admin'), 'Kredensial belum lengkap');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkmId: number;
  let industriId: number;
  let trxId: number;
  const uniqueTag = Date.now().toString();
  const msgReview = `E2E_FR17_REVIEW_${uniqueTag}`;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });

    const umkmUser = await supabase.from('users').select('id').eq('email', process.env.E2E_UMKM_EMAIL!).single();
    const umkm = await supabase.from('umkm').select('id').eq('user_id', umkmUser.data!.id).single();
    umkmId = umkm.data!.id;

    const industriUser = await supabase.from('users').select('id').eq('email', process.env.E2E_INDUSTRI_EMAIL!).single();
    const industri = await supabase.from('industri').select('id').eq('user_id', industriUser.data!.id).single();
    industriId = industri.data!.id;

    const { data: req } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'approve',
      pesan: msgReview,
      kuantitas: 1
    }).select('id').single();

    const { data: trx } = await supabase.from('transaksi').insert({
      request_id: req!.id,
      status: 'lunas',
      status_validasi: 'valid',
      progress_status: 'Selesai',
      tanggal_selesai: new Date().toISOString()
    }).select('id').single();
    trxId = trx!.id;
  });

  test('TC-17-03: Rating tanpa bintang', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/beri-ulasan');

    const trxCard = page.locator('.cursor-pointer', { hasText: msgReview }).first();
    await expect(trxCard).toBeVisible();
    await trxCard.click();

    // Isi komentar
    await page.getByPlaceholder('Apakah barang yang disuplai sesuai ekspektasi').fill('Bagus, tapi saya tidak kasih bintang dulu');
    
    // Submit tanpa klik bintang
    await page.getByRole('button', { name: 'Kirim untuk Ditampilkan di Platform' }).click();

    // Validasi error
    await expect(page.getByText('Rating wajib diisi')).toBeVisible();
  });

  test('TC-17-02: Rating tanpa komentar', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/beri-ulasan');

    const trxCard = page.locator('.cursor-pointer', { hasText: msgReview }).first();
    await expect(trxCard).toBeVisible();
    await trxCard.click();

    // Klik bintang ke-4 (indeks 3)
    const stars = page.locator('button').filter({ has: page.locator('svg.lucide-star') });
    await expect(stars.nth(3)).toBeVisible();
    await stars.nth(3).click();
    
    // Submit
    await page.getByRole('button', { name: 'Kirim untuk Ditampilkan di Platform' }).click();

    // Validasi sukses
    await expect(page.getByText('Ulasan berhasil dikirim!').first()).toBeVisible();
  });

  test('TC-17-01: Submit review berhasil (edit)', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/beri-ulasan');

    const trxCard = page.locator('.cursor-pointer', { hasText: msgReview }).first();
    await expect(trxCard).toBeVisible();
    await trxCard.click();

    // Sudah dikirim, kita bisa edit
    await page.getByRole('button', { name: 'Edit Ulasan' }).click();

    // Klik bintang ke-5 (indeks 4)
    const stars = page.locator('button').filter({ has: page.locator('svg.lucide-star') });
    await stars.nth(4).click();

    // Isi komentar
    await page.getByPlaceholder('Apakah barang yang disuplai sesuai ekspektasi').fill('Sangat Sempurna dan Mantap!');
    
    // Submit
    await page.getByRole('button', { name: 'Simpan Perubahan' }).click();

    // Validasi sukses
    await expect(page.getByText('Ulasan berhasil dikirim!').first()).toBeVisible();
  });

  test.afterAll(async () => {
    if (trxId) {
      await supabase.from('ulasan').delete().eq('transaksi_id', trxId);
      await supabase.from('transaksi').delete().eq('id', trxId);
      await supabase.from('request').delete().like('pesan', `E2E_FR17%`);
    }
  });
});
