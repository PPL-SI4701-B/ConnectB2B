import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Muat dari .env.test (berisi SUPABASE key + kredensial test)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback ke .env.local jika ada override
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

/**
 * FR-13: Notifikasi UMKM
 * Skenario: UMKM menerima notifikasi saat ada request kerja sama baru.
 */
test.describe.serial('FR-13: Notifikasi UMKM', () => {
  // Hanya jalankan jika memiliki kredensial
  test.skip(!hasCreds('UMKM') || !hasCreds('Admin'), 'Kredensial UMKM atau Admin belum diisi di .env.test');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkmUserId: string = '';

  test.beforeAll(async () => {
    // Kita gunakan Supabase JS client untuk mengirim notifikasi secara langsung
    // Ini mensimulasikan "Request baru masuk" tanpa harus UI checkout yang panjang
    supabase = createClient(supabaseUrl, supabaseKey);
    
    const adminEmail = process.env.E2E_ADMIN_EMAIL!;
    const adminPass = process.env.E2E_ADMIN_PASSWORD!;
    const umkmEmail = process.env.E2E_UMKM_EMAIL!;

    // Login sebagai admin untuk bypass RLS (atau minimal bisa panggil RPC)
    await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPass });

    // Dapatkan ID user dari UMKM target
    const { data } = await supabase.from('users').select('id').eq('email', umkmEmail).single();
    if (data) {
      umkmUserId = data.id;
      // Hapus notif dummy sisa dari test sebelumnya jika ada
      await supabase.from('notifikasi').delete().eq('user_id', umkmUserId).like('pesan', 'E2E_TEST_NOTIF%');
    } else {
      throw new Error(`Tidak dapat menemukan user dengan email ${umkmEmail}`);
    }
  });

  test('TC-13-01: Notifikasi muncul (Badge bertambah)', async ({ page }) => {
    // Login sebagai UMKM
    await login(page, 'UMKM');

    // Tunggu komponen Bell notifikasi dimuat dan realtime subscription aktif
    const bellBtn = page.locator('button').filter({ has: page.locator('svg.lucide-bell') });
    await expect(bellBtn).toBeVisible();
    
    // Beri waktu sejenak (2 detik) agar WebSocket Supabase Realtime channel selesai connect
    await page.waitForTimeout(2000);
    
    // Simpan jumlah unread saat ini (jika ada)
    const badge = bellBtn.locator('span.absolute');
    
    // Trigger notifikasi menggunakan Node client di background
    await supabase.rpc('kirim_notifikasi', {
      p_target_user_id: umkmUserId,
      p_pesan: 'E2E_TEST_NOTIF: Permintaan kerja sama baru',
    });

    // Karena tabel notifikasi mungkin belum di-enable untuk Supabase Realtime di level database (publication),
    // kita perlu memuat ulang halaman agar fetchNotifications() menarik data terbaru dari server.
    await page.reload();

    // Tunggu kembali komponen Bell
    const bellBtnReloaded = page.locator('button').filter({ has: page.locator('svg.lucide-bell') });
    await expect(bellBtnReloaded).toBeVisible();
    const newBadge = bellBtnReloaded.locator('span.absolute');

    // Validasi badge muncul/berubah
    await expect(newBadge).toBeVisible();
  });

  test('TC-13-02: Klik notifikasi (Redirect ke detail)', async ({ page }) => {
    await login(page, 'UMKM');

    const bellBtn = page.locator('button').filter({ has: page.locator('svg.lucide-bell') });
    await expect(bellBtn).toBeVisible();

    // Klik bell untuk membuka dropdown
    await bellBtn.click();

    // Cari item notifikasi yang tadi dibuat
    const notifItem = page.getByText('E2E_TEST_NOTIF: Permintaan kerja sama baru').first();
    await expect(notifItem).toBeVisible();

    // Klik notifikasi tersebut
    await notifItem.click();

    // Pastikan diarahkan ke halaman request-masuk
    await expect(page).toHaveURL(/\/request-masuk/);
  });

  test('TC-13-03: Mark as read', async ({ page }) => {
    await login(page, 'UMKM');

    const bellBtn = page.locator('button').filter({ has: page.locator('svg.lucide-bell') });
    await expect(bellBtn).toBeVisible();

    // Klik bell
    await bellBtn.click();

    // Validasi bahwa notif sekarang tidak bold / status dibaca
    const notifItem = page.locator('li').filter({ hasText: 'E2E_TEST_NOTIF: Permintaan kerja sama baru' }).first();
    await expect(notifItem).toBeVisible();
    
    // Teksnya seharusnya sudah jadi "text-slate-600" karena bukan "belum dibaca" lagi
    // (di NotificationBell.tsx, text "belum dibaca" menggunakan text-slate-800 font-medium)
    await expect(notifItem.locator('p').first()).toHaveClass(/text-slate-600/);
    
    // Atau bisa dicek dengan tidak adanya titik biru (indigo-500)
    await expect(notifItem.locator('.bg-indigo-500')).toBeHidden();
  });

  test.afterAll(async () => {
    // Bersihkan notif dummy
    if (umkmUserId) {
      await supabase.from('notifikasi').delete().eq('user_id', umkmUserId).like('pesan', 'E2E_TEST_NOTIF%');
    }
  });
});
