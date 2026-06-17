import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Muat dari .env.test (berisi SUPABASE key + kredensial test)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback ke .env.local jika ada override
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-28: Upload Bukti Pembayaran', () => {
  test.skip(!hasCreds('Industri') || !hasCreds('UMKM'), 'Kredensial belum lengkap');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkmId: number;
  let industriId: number;
  let trxSelesaiId: number;
  let trxKomplainId: number;
  const uniqueTag = Date.now().toString();
  const msg1 = `E2E_FR28_MSG_${uniqueTag}`;

  // Paths to dummy files
  const dummyJpgPath = path.join(__dirname, 'dummy.jpg');
  const dummyPdfPath = path.join(__dirname, 'dummy.pdf');

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create dummy files for upload
    if (!fs.existsSync(dummyJpgPath)) {
      fs.writeFileSync(dummyJpgPath, 'fake image content');
    }
    if (!fs.existsSync(dummyPdfPath)) {
      fs.writeFileSync(dummyPdfPath, 'fake pdf content');
    }

    try {
      await supabase.auth.signInWithPassword({
        email: process.env.E2E_ADMIN_EMAIL!,
        password: process.env.E2E_ADMIN_PASSWORD!,
      });
    } catch (e) {
      console.error("Auth Exception:", e);
    }

    const umkmUser = await supabase.from('users').select('id').eq('email', process.env.E2E_UMKM_EMAIL!).single();
    const umkm = await supabase.from('umkm').select('id').eq('user_id', umkmUser.data!.id).single();
    umkmId = umkm.data!.id;

    const industriUser = await supabase.from('users').select('id').eq('email', process.env.E2E_INDUSTRI_EMAIL!).single();
    const industri = await supabase.from('industri').select('id').eq('user_id', industriUser.data!.id).single();
    industriId = industri.data!.id;

    // Bersihkan data dummy sebelumnya
    const { data: oldReqs } = await supabase.from('request').select('id').like('pesan', 'E2E_FR28%');
    if (oldReqs && oldReqs.length > 0) {
      const oldReqIds = oldReqs.map(r => r.id);
      await supabase.from('pembayaran').delete().in('transaksi_id', (await supabase.from('transaksi').select('id').in('request_id', oldReqIds)).data?.map(t => t.id) || []);
      await supabase.from('transaksi').delete().in('request_id', oldReqIds);
      await supabase.from('request').delete().in('id', oldReqIds);
    }

    // Buat Request & Transaksi
    const { data: req1 } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'approve',
      pesan: msg1,
      kuantitas: 1
    }).select('id').single();

    const { data: trx1 } = await supabase.from('transaksi').insert({
      request_id: req1!.id,
      status: 'belum lunas',
      status_validasi: 'menunggu',
    }).select('id').single();
    trxSelesaiId = trx1!.id;
  });

  test.beforeEach(async ({ page }) => {
    // Clean up pembayaran for this transaction to reset state
    await supabase.from('pembayaran').delete().eq('transaksi_id', trxSelesaiId);
    await login(page, 'Industri');
    await page.goto('/pantau-transaksi');

    const trxCard = page.locator('.cursor-pointer', { hasText: msg1 }).first();
    await expect(trxCard).toBeVisible();
    await trxCard.click();
  });

  test('TC-28-02: Upload tanpa nominal', async ({ page }) => {
    // Kosongkan nominal
    const nominalInput = page.getByPlaceholder('0');
    await expect(nominalInput).toBeVisible();
    await nominalInput.fill(''); // Tanpa nominal

    // Upload file JPG
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label').filter({ hasText: 'Klik untuk pilih file' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(dummyJpgPath);

    // Validasi tombol disabled
    const btnSubmit = page.getByRole('button', { name: 'Kirim Bukti Transfer' });
    await expect(btnSubmit).toBeDisabled();
  });

  test('TC-28-03: File bukan gambar', async ({ page }) => {
    // Isi nominal
    const nominalInput = page.getByPlaceholder('0');
    await expect(nominalInput).toBeVisible();
    await nominalInput.fill('1000000');

    // Paksa upload PDF
    // Memakai locator input[type="file"] karena accept attribute bisa ngeblok filechooser biasa
    await page.locator('input[type="file"]').setInputFiles(dummyPdfPath);

    // Validasi error format muncul
    await expect(page.getByText('Format file harus JPG atau PNG.')).toBeVisible();

    // Validasi tombol masih disabled karena file ditolak dan tidak tersimpan di state
    const btnSubmit = page.getByRole('button', { name: 'Kirim Bukti Transfer' });
    await expect(btnSubmit).toBeDisabled();
  });

  test('TC-28-01: Upload bukti berhasil', async ({ page }) => {
    // Isi nominal
    const nominalInput = page.getByPlaceholder('0');
    await expect(nominalInput).toBeVisible();
    await nominalInput.fill('1000000');

    // Upload file JPG
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('label').filter({ hasText: 'Klik untuk pilih file' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(dummyJpgPath);

    // File info muncul
    await expect(page.getByText('dummy.jpg')).toBeVisible();

    // Klik kirim
    const btnSubmit = page.getByRole('button', { name: 'Kirim Bukti Transfer' });
    await expect(btnSubmit).toBeEnabled();
    await btnSubmit.click();

    // Validasi berubah menjadi pending
    await expect(page.getByText('Bukti Transfer Dikirim')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Menunggu validasi oleh Admin ConnectB2B.')).toBeVisible();

    // Validasi ke DB
    const { data: pay } = await supabase.from('pembayaran').select('*').eq('transaksi_id', trxSelesaiId).single();
    expect(pay).not.toBeNull();
    expect(pay!.status).toBe('pending');
    expect(pay!.jumlah_transfer).toBe(1000000);
  });

  test.afterAll(async () => {
    // Clean up DB
    await supabase.from('pembayaran').delete().eq('transaksi_id', trxSelesaiId);
    await supabase.from('transaksi').delete().eq('id', trxSelesaiId);
    const { data: oldReqs } = await supabase.from('request').select('id').like('pesan', 'E2E_FR28%');
    if (oldReqs && oldReqs.length > 0) {
      await supabase.from('request').delete().in('id', oldReqs.map(r => r.id));
    }
    // Delete dummy files
    if (fs.existsSync(dummyJpgPath)) fs.unlinkSync(dummyJpgPath);
    if (fs.existsSync(dummyPdfPath)) fs.unlinkSync(dummyPdfPath);
  });
});
