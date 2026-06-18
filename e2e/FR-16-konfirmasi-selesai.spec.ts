import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Muat dari .env.test (berisi SUPABASE key + kredensial test)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback ke .env.local jika ada override
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-16: Konfirmasi Selesai / Komplain (Industri)', () => {
  test.skip(!hasCreds('Industri') || !hasCreds('Admin'), 'Kredensial belum lengkap');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkmId: number;
  let industriId: number;
  let trxSelesaiId: number;
  let trxKomplainId: number;
  const uniqueTag = Date.now().toString();
  const msgSelesai = `E2E_FR16_SELESAI_${uniqueTag}`;
  const msgKomplain = `E2E_FR16_KOMPLAIN_${uniqueTag}`;

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
    const { data: oldReqs } = await supabase.from('request').select('id').like('pesan', 'E2E_FR16%');
    if (oldReqs && oldReqs.length > 0) {
      const oldReqIds = oldReqs.map(r => r.id);
      await supabase.from('transaksi').delete().in('request_id', oldReqIds);
      await supabase.from('request').delete().in('id', oldReqIds);
    }

    // Buat Request 1 (Untuk Selesai)
    const { data: req1 } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'approve',
      pesan: msgSelesai,
      kuantitas: 1
    }).select('id').single();

    const { data: trx1 } = await supabase.from('transaksi').insert({
      request_id: req1!.id,
      status: 'lunas',
      status_validasi: 'valid',
      bukti_pengiriman_umkm: 'mock-url.pdf', // Triggers "isReadyToConfirm"
    }).select('id').single();
    trxSelesaiId = trx1!.id;

    // Buat Request 2 (Untuk Komplain)
    const { data: req2 } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'approve',
      pesan: msgKomplain,
      kuantitas: 1
    }).select('id').single();

    const { data: trx2 } = await supabase.from('transaksi').insert({
      request_id: req2!.id,
      status: 'lunas',
      status_validasi: 'valid',
    }).select('id').single();
    trxKomplainId = trx2!.id;
  });

  test('TC-16-01: Konfirmasi selesai', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/pantau-transaksi');

    // Klik transaksi yang dikhususkan untuk test selesai
    const trxCard = page.locator('.cursor-pointer', { hasText: msgSelesai }).first();
    await expect(trxCard).toBeVisible();
    await trxCard.click();

    // Validasi ada alert info UMKM telah mengupload bukti (FR-16 prasyarat)
    await expect(page.getByText('UMKM Telah Mengupload Bukti Selesai Pengerjaan')).toBeVisible();

    // Klik konfirmasi pesanan selesai
    const btnSelesai = page.getByRole('button', { name: /Konfirmasi Pesanan Selesai/i });
    await expect(btnSelesai).toBeVisible();
    await btnSelesai.click();

    // Validasi UI berubah sukses dan redirect ke halaman review
    await expect(page.getByText('Pesanan Berhasil Dikonfirmasi!')).toBeVisible();
    await expect(page).toHaveURL(/\/beri-ulasan/, { timeout: 15000 });
    // Beri jeda agar konten halaman selesai dimuat & tampil penuh di frame akhir trace
    await page.waitForTimeout(2000);
  });

  test('TC-16-02: Ajukan komplain', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/pantau-transaksi');

    // Klik transaksi yang dikhususkan untuk test komplain
    const trxCard = page.locator('.cursor-pointer', { hasText: msgKomplain }).first();
    await expect(trxCard).toBeVisible();
    await trxCard.click();

    // Klik ajukan komplain
    const btnKomplain = page.getByRole('button', { name: /Ajukan Komplain/i });
    await expect(btnKomplain).toBeVisible();
    await btnKomplain.click();

    // Tunggu modal form komplain (asumsi modal / form dialog komplain muncul, 
    // jika kita lihat di PantauTransaksiClient, setKomplainOpen(true) dipanggil, meskipun layout detailnya tidak full ter-render di snippet sebelumnya, kita asumsikan teks "Komplain" atau placeholder text-nya)
    
    // Mari cari textarea komplain
    const modalKomplain = page.getByPlaceholder('Tuliskan detail keluhan Anda...');
    await expect(modalKomplain).toBeVisible();
    await modalKomplain.fill('Barang cacat dan tidak sesuai spek');

    const btnSubmitKomplain = page.getByRole('button', { name: 'Kirim Komplain' });
    await expect(btnSubmitKomplain).toBeVisible();
    await btnSubmitKomplain.click();

    // Validasi success toast atau banner
    await expect(page.getByText('Komplain Anda sudah dikirim ke UMKM & Admin.')).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    if (trxSelesaiId || trxKomplainId) {
      await supabase.from('transaksi_history').delete().in('transaksi_id', [trxSelesaiId, trxKomplainId]);
      await supabase.from('notifikasi').delete().like('pesan', '%E2E_FR16%');
      const { data: oldReqs } = await supabase.from('request').select('id').like('pesan', 'E2E_FR16%');
      if (oldReqs && oldReqs.length > 0) {
        const oldReqIds = oldReqs.map(r => r.id);
        await supabase.from('transaksi').delete().in('request_id', oldReqIds);
        await supabase.from('request').delete().in('id', oldReqIds);
      }
    }
  });
});
