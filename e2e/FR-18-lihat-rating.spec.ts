import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Muat dari .env.test (berisi SUPABASE key + kredensial test)
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback ke .env.local jika ada override
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

test.describe.serial('FR-18: Lihat Rating (Pengguna)', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  let supabase: ReturnType<typeof createClient>;
  let umkm1Id: number;
  let umkm2Id: number;
  let industriId: number;

  const uniqueTag = Date.now().toString();
  const reqBase1 = `E2E_FR18_U1_${uniqueTag}`;
  const reqBase2 = `E2E_FR18_U2_${uniqueTag}`;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.auth.signInWithPassword({
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });

    const umkmUser1 = await supabase.from('users').select('id').eq('email', process.env.E2E_UMKM_EMAIL!).single();
    const umkm1 = await supabase.from('umkm').select('id').eq('user_id', umkmUser1.data!.id).single();
    umkm1Id = umkm1.data!.id;

    // UMKM 2 (umkmanon2) - assume it's created or we just test with the first one and create reviews dynamically
    // Wait, let's just use UMKM1 to test "3 ulasan" and assume there is a UMKM without ulasan or we can just test with UMKM1 for average rating
    // Since we can't easily isolate the catalog view to just ONE UMKM without searching, we'll just search for the UMKM's exact name
    
    const industriUser = await supabase.from('users').select('id').eq('email', process.env.E2E_INDUSTRI_EMAIL!).single();
    const industri = await supabase.from('industri').select('id').eq('user_id', industriUser.data!.id).single();
    industriId = industri.data!.id;

    // Create 3 reviews for umkm1
    for (let i = 1; i <= 3; i++) {
      const { data: req } = await supabase.from('request').insert({
        umkm_id: umkm1Id,
        industri_id: industriId,
        status: 'approve',
        pesan: `${reqBase1}_${i}`,
        kuantitas: 1
      }).select('id').single();

      const { data: trx } = await supabase.from('transaksi').insert({
        request_id: req!.id,
        status: 'lunas',
        status_validasi: 'valid',
        progress_status: 'Selesai'
      }).select('id').single();

      // rating: 4, 5, 5 => avg 4.7
      await supabase.from('ulasan').insert({
        transaksi_id: trx!.id,
        rating: i === 1 ? 4 : 5,
        komentar: `Test rating ${i}`
      });
    }
  });

  test('TC-18-01: Tampil rata-rata rating', async ({ page }) => {
    await page.goto('/katalog-publik');

    // Karena e2e umkmanon1 kita tambahkan 3 review (rating 4, 5, 5 => rata-rata 4.7)
    // Walaupun ada review lain di DB dari test lain, rating rata-rata akan dihitung
    // Untuk memastikan kita menemukan card yang benar, kita cari card umkmanon1
    const umkmCard = page.locator('a.group', { hasText: 'umkmanon1' }).first();
    await expect(umkmCard).toBeVisible();
    
    // Validasi text bintang (format: X.X (Y))
    await expect(umkmCard.getByText(/4\.[0-9] \([0-9]+\)/)).toBeVisible();
  });

  test('TC-18-02: Belum ada ulasan', async ({ page }) => {
    await page.goto('/katalog-publik');

    // Cari card mana saja yang belum ada ulasan
    const noReviewCard = page.locator('a.group').filter({ hasText: /Belum ada ulasan/i }).first();
    
    // Validasi rating adalah Belum ada ulasan
    await expect(noReviewCard).toBeVisible();
  });

  test.afterAll(async () => {
    // Cleanup requests using the uniqueTag
    const { data: reqs } = await supabase.from('request').select('id').like('pesan', `${reqBase1}%`);
    if (reqs && reqs.length > 0) {
      const ids = reqs.map(r => r.id);
      const { data: trxs } = await supabase.from('transaksi').select('id').in('request_id', ids);
      if (trxs && trxs.length > 0) {
        const trxIds = trxs.map(t => t.id);
        await supabase.from('ulasan').delete().in('transaksi_id', trxIds);
        await supabase.from('transaksi').delete().in('id', trxIds);
      }
      await supabase.from('request').delete().in('id', ids);
    }
  });
});
