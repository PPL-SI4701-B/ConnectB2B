import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-14: Terima/Tolak Request (UMKM)', () => {
  test.skip(!hasCreds('UMKM') || !hasCreds('Admin'), 'Kredensial belum lengkap');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkmId: number;
  let industriId: number;
  let reqTerimaId: number;
  let reqTolakId: number;
  const uniqueTag = Date.now().toString();
  const msgAccept = `E2E_FR14_ACCEPT_${uniqueTag}`;
  const msgReject = `E2E_FR14_REJECT_${uniqueTag}`;

  test.beforeAll(async () => {
    if (!supabaseUrl) throw new Error("Supabase URL is missing");
    
    supabase = createClient(supabaseUrl, supabaseKey);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: process.env.E2E_ADMIN_EMAIL!,
        password: process.env.E2E_ADMIN_PASSWORD!,
      });
      if (authErr) console.error("Auth Error:", authErr.message);
    } catch (e) {
      console.error("Auth Exception:", e);
      throw e;
    }

    // Ambil ID profil UMKM
    const umkmUser = await supabase.from('users').select('id').eq('email', process.env.E2E_UMKM_EMAIL!).single();
    if (!umkmUser.data) throw new Error(`UMKM User null! Error: ${umkmUser.error?.message}`);
    const umkm = await supabase.from('umkm').select('id').eq('user_id', umkmUser.data.id).single();
    umkmId = umkm.data!.id;

    // Ambil ID profil Industri
    const industriUser = await supabase.from('users').select('id').eq('email', process.env.E2E_INDUSTRI_EMAIL!).single();
    const industri = await supabase.from('industri').select('id').eq('user_id', industriUser.data!.id).single();
    industriId = industri.data!.id;

    // Bersihkan data dummy sebelumnya
    await supabase.from('request').delete().eq('umkm_id', umkmId).like('pesan', 'E2E_FR14%');

    // Buat Request 1 (Untuk Diterima)
    const { data: req1 } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'pending',
      pesan: msgAccept,
      kuantitas: 100
    }).select('id').single();
    reqTerimaId = req1!.id;

    // Buat Request 2 (Untuk Ditolak)
    const { data: req2 } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'pending',
      pesan: msgReject,
      kuantitas: 50
    }).select('id').single();
    reqTolakId = req2!.id;
  });

  test('TC-14-01: Terima request', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/request-masuk');

    // Cari request yang akan diterima
    const reqCard = page.locator('.bg-card-bg', { hasText: msgAccept });
    await expect(reqCard).toBeVisible();

    // Klik tombol Terima
    const btnTerima = reqCard.getByRole('button', { name: /Terima & Buat Transaksi/i });
    await btnTerima.click();

    // Validasi notifikasi toast
    await expect(page.getByText(/Request diterima! Transaksi telah dibuat/i)).toBeVisible({ timeout: 10000 });

    // Validasi status berubah (muncul di riwayat)
    const historySection = page.locator('h2', { hasText: 'Riwayat Request' }).locator('..');
    const acceptedCard = historySection.locator('.bg-card-bg', { hasText: msgAccept });
    await expect(acceptedCard.getByText('Request Diterima')).toBeVisible();
  });

  test('TC-14-02: Tolak request', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/request-masuk');

    // Cari request yang akan ditolak
    const reqCard = page.locator('.bg-card-bg', { hasText: msgReject });
    await expect(reqCard).toBeVisible();

    // Klik tombol Tolak
    const btnTolak = reqCard.getByRole('button', { name: /Tolak Request/i });
    await btnTolak.click();

    // Validasi notifikasi toast
    await expect(page.getByText(/Request ditolak. Notifikasi dikirim/i)).toBeVisible({ timeout: 10000 });

    // Validasi status berubah di riwayat
    const historySection = page.locator('h2', { hasText: 'Riwayat Request' }).locator('..');
    const rejectedCard = historySection.locator('.bg-card-bg', { hasText: msgReject });
    await expect(rejectedCard.getByText('Request Ditolak')).toBeVisible();
  });

  test.afterAll(async () => {
    if (umkmId) {
      await supabase.from('request').delete().eq('umkm_id', umkmId).like('pesan', 'E2E_FR14%');
    }
  });
});
