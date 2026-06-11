import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-29: Validasi Pembayaran', () => {
  test.skip(!hasCreds('Admin') || !hasCreds('Industri'), 'Kredensial belum lengkap');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkmId: number;
  let industriId: number;
  let trxValidId: number;
  let trxDitolakId: number;
  const uniqueTag = Date.now().toString();
  const msgValid = `E2E_FR29_VALID_${uniqueTag}`;
  const msgDitolak = `E2E_FR29_DITOLAK_${uniqueTag}`;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data: oldReqs } = await supabase.from('request').select('id').like('pesan', 'E2E_FR29%');
    if (oldReqs && oldReqs.length > 0) {
      const oldReqIds = oldReqs.map(r => r.id);
      await supabase.from('pembayaran').delete().in('transaksi_id', (await supabase.from('transaksi').select('id').in('request_id', oldReqIds)).data?.map(t => t.id) || []);
      await supabase.from('transaksi').delete().in('request_id', oldReqIds);
      await supabase.from('request').delete().in('id', oldReqIds);
    }

    // 1. Setup untuk Validasi Berhasil
    const { data: req1 } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'approve',
      pesan: msgValid,
      kuantitas: 1
    }).select('id').single();

    const { data: trx1 } = await supabase.from('transaksi').insert({
      request_id: req1!.id,
      status: 'belum lunas',
      status_validasi: 'menunggu',
    }).select('id').single();
    trxValidId = trx1!.id;

    await supabase.from('pembayaran').insert({
      transaksi_id: trxValidId,
      status: 'pending',
      jumlah_transfer: 1000000,
      bukti_transfer: 'dummy.jpg',
      tanggal_bayar: new Date().toISOString()
    });

    // 2. Setup untuk Ditolak
    const { data: req2 } = await supabase.from('request').insert({
      umkm_id: umkmId,
      industri_id: industriId,
      status: 'approve',
      pesan: msgDitolak,
      kuantitas: 1
    }).select('id').single();

    const { data: trx2 } = await supabase.from('transaksi').insert({
      request_id: req2!.id,
      status: 'belum lunas',
      status_validasi: 'menunggu',
    }).select('id').single();
    trxDitolakId = trx2!.id;

    await supabase.from('pembayaran').insert({
      transaksi_id: trxDitolakId,
      status: 'pending',
      jumlah_transfer: 2000000,
      bukti_transfer: 'dummy.jpg',
      tanggal_bayar: new Date().toISOString()
    });
  });

  test.beforeEach(async ({ page }) => {
    // Reset data jika test di-rerun
    await supabase.from('pembayaran').update({ status: 'pending', catatan_admin: null }).in('transaksi_id', [trxValidId, trxDitolakId]);
    await supabase.from('transaksi').update({ status: 'belum lunas' }).in('id', [trxValidId, trxDitolakId]);
    
    await login(page, 'Admin');
    await page.goto('/admin');
  });

  test('TC-29-01: Validasi berhasil', async ({ page }) => {
    // Cari baris berdasarkan TRX id
    const trxIdFormatted = `TRX-${String(trxValidId).padStart(4, '0')}`;
    const row = page.locator('tr').filter({ hasText: trxIdFormatted }).first();
    await expect(row).toBeVisible();

    // Klik "Dana Masuk (Valid)"
    const btnValid = row.getByRole('button', { name: /Dana Masuk/i });
    await expect(btnValid).toBeVisible();
    await btnValid.click();

    // Konfirmasi di modal
    const modalConfirm = page.getByRole('button', { name: 'Ya, Validasi' });
    await expect(modalConfirm).toBeVisible();
    await modalConfirm.click();

    // Pastikan hilang dari tabel setelah delay atau menampilkan toast
    await expect(page.getByText(/berhasil diverifikasi/i)).toBeVisible({ timeout: 15000 });
    
    // Verifikasi di DB
    const { data: pay } = await supabase.from('pembayaran').select('status').eq('transaksi_id', trxValidId).single();
    expect(pay?.status).toBe('berhasil');

    const { data: trx } = await supabase.from('transaksi').select('status').eq('id', trxValidId).single();
    expect(trx?.status).toBe('lunas');
  });

  test('TC-29-02: Tolak pembayaran', async ({ page }) => {
    // Cari baris berdasarkan TRX id
    const trxIdFormatted = `TRX-${String(trxDitolakId).padStart(4, '0')}`;
    const row = page.locator('tr').filter({ hasText: trxIdFormatted }).first();
    await expect(row).toBeVisible();

    // Klik "Tolak (Tidak Valid)"
    const btnTolak = row.getByRole('button', { name: /Tolak/i });
    await expect(btnTolak).toBeVisible();
    await btnTolak.click();

    // Isi alasan penolakan
    const inputAlasan = page.getByPlaceholder('Mis. nominal tidak sesuai, bukti tidak jelas/buram...');
    await expect(inputAlasan).toBeVisible();
    await inputAlasan.fill('Bukti palsu');

    // Submit
    const modalTolak = page.getByRole('button', { name: 'Ya, Tolak' });
    await expect(modalTolak).toBeVisible();
    await modalTolak.click();

    // Validasi toast sukses ditolak
    await expect(page.getByText(/berhasil ditolak/i)).toBeVisible({ timeout: 15000 });

    // Verifikasi di DB
    const { data: pay } = await supabase.from('pembayaran').select('status, catatan_admin').eq('transaksi_id', trxDitolakId).single();
    expect(pay?.status).toBe('gagal');
    expect(pay?.catatan_admin).toBe('Bukti palsu');

    // Transaksi tetap belum lunas
    const { data: trx } = await supabase.from('transaksi').select('status').eq('id', trxDitolakId).single();
    expect(trx?.status).toBe('belum lunas');
  });

  test.afterAll(async () => {
    await supabase.from('notifikasi').delete().like('pesan', '%E2E_FR29%');
    await supabase.from('pembayaran').delete().in('transaksi_id', [trxValidId, trxDitolakId]);
    await supabase.from('transaksi').delete().in('id', [trxValidId, trxDitolakId]);
    const { data: oldReqs } = await supabase.from('request').select('id').like('pesan', 'E2E_FR29%');
    if (oldReqs && oldReqs.length > 0) {
      await supabase.from('request').delete().in('id', oldReqs.map(r => r.id));
    }
  });
});
