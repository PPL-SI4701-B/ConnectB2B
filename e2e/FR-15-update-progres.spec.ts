import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-15: Update Progres Pekerjaan (UMKM)', () => {
  test.skip(!hasCreds('UMKM') || !hasCreds('Admin'), 'Kredensial belum lengkap');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkmId: number;
  let industriId: number;
  let trxId: number;
  const uniqueTag = Date.now().toString();
  const msgProgres = `E2E_FR15_${uniqueTag}`;

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

    const umkmUser = await supabase.from('users').select('id').eq('email', process.env.E2E_UMKM_EMAIL!).single();
    if (!umkmUser.data) throw new Error(`UMKM User null! Error: ${umkmUser.error?.message}`);
    const umkm = await supabase.from('umkm').select('id').eq('user_id', umkmUser.data.id).single();
    umkmId = umkm.data!.id;

    const industriUser = await supabase.from('users').select('id').eq('email', process.env.E2E_INDUSTRI_EMAIL!).single();
    const industri = await supabase.from('industri').select('id').eq('user_id', industriUser.data!.id).single();
    industriId = industri.data!.id;

    // Bersihkan data dummy sebelumnya
    const { data: oldReqs } = await supabase.from('request').select('id').like('pesan', 'E2E_FR15%');
    if (oldReqs && oldReqs.length > 0) {
      const oldReqIds = oldReqs.map(r => r.id);
      await supabase.from('transaksi').delete().in('request_id', oldReqIds);
      await supabase.from('request').delete().in('id', oldReqIds);
    }

    // Buat Request yang sudah diapprove
    const { data: req } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'approve',
      pesan: msgProgres,
      kuantitas: 1
    }).select('id').single();

    // Buat Transaksi dengan status lunas agar bisa diupdate progress-nya
    const { data: trx } = await supabase.from('transaksi').insert({
      request_id: req!.id,
      status: 'lunas',
      status_validasi: 'valid',
    }).select('id').single();
    trxId = trx!.id;
  });

  test('TC-15-02: Daftar transaksi aktif', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/dashboard/transaksi');

    // Pastikan berada di tab Dalam Pengerjaan karena statusnya 'lunas'
    const btnPengerjaan = page.locator('button', { hasText: 'Dalam Pengerjaan' });
    await btnPengerjaan.click();

    // Cari transaksi yang baru dibuat
    const trxCard = page.locator('.bg-card-bg', { hasText: msgProgres }).first();
    await expect(trxCard).toBeVisible();
    await expect(trxCard.getByText('Transaksi Selesai')).toBeVisible();
  });

  test('TC-15-01: Update status berhasil', async ({ page }) => {
    await login(page, 'UMKM');
    await page.goto('/dashboard/transaksi');

    const btnPengerjaan = page.locator('button', { hasText: 'Dalam Pengerjaan' });
    await btnPengerjaan.click();

    const trxCard = page.locator('.bg-card-bg', { hasText: msgProgres }).first();
    await expect(trxCard).toBeVisible();

    // Pastikan ada tombol Update Progres (karena status lunas)
    const btnUpdate = trxCard.getByRole('button', { name: 'Update Progres' });
    await btnUpdate.click();

    // Tunggu modal muncul
    const modal = page.locator('.fixed.inset-0', { hasText: 'Update Status Kerja Sama' });
    await expect(modal).toBeVisible();

    // Pilih status Sedang Diproses
    await page.locator('select').selectOption('Sedang Diproses');
    
    // Isi pesan opsional
    await page.getByPlaceholder('Contoh: Produksi telah mencapai').fill('Barang sedang dikerjakan tahap awal');

    // Submit (intersep alert window jika muncul dari browser)
    page.once('dialog', dialog => dialog.accept());
    
    const btnSubmit = modal.getByRole('button', { name: 'Kirim Update ke Industri' });
    await btnSubmit.click();

    // Tunggu modal hilang dan status badge terupdate di UI
    await expect(modal).toBeHidden({ timeout: 10000 });
    
    // Validasi badge di card terupdate dengan teks "Sedang Diproses"
    await expect(trxCard.locator('span', { hasText: 'Sedang Diproses' })).toBeVisible();
  });

  test.afterAll(async () => {
    if (trxId) {
      await supabase.from('transaksi_history').delete().eq('transaksi_id', trxId);
      const { data: oldReqs } = await supabase.from('request').select('id').like('pesan', 'E2E_FR15%');
      if (oldReqs && oldReqs.length > 0) {
        const oldReqIds = oldReqs.map(r => r.id);
        await supabase.from('transaksi').delete().in('request_id', oldReqIds);
        await supabase.from('request').delete().in('id', oldReqIds);
      }
    }
  });
});
