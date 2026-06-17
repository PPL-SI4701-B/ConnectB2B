# E2E Testing dengan Database Test Terpisah

Test E2E ConnectB2B berjalan terhadap **database Supabase terpisah & kosong**
(project **ConnectB2B-Test**, ref `mlfbofvybqlhniiorlwr`), bukan database asli.
Jadi menjalankan test **tidak pernah mengotori data produksi**.

## Cara menjalankan test

```bash
npx playwright test --headed        # browser terlihat (untuk demo dosen)
npx playwright test                 # headless (cepat)
npx playwright test --ui            # mode UI interaktif
```

Playwright otomatis:
1. `next build && next start -p 3100` dengan env diarahkan ke database test
2. Menjalankan semua test FR-01..FR-29 terhadap server itu

> Dev server harian Anda (`npm run dev` di port 3000) tetap memakai database ASLI.
> Test memakai port 3100 + database test, jadi keduanya tidak bentrok.

## Isi database test (hasil seed)

File: [`supabase/migrations/20260101000000_init_schema.sql`](../supabase/migrations/20260101000000_init_schema.sql) (skema) + [`supabase/seed.sql`](../supabase/seed.sql) (data).

Akun test (password semua `12345678`):

| Email | Role | Status |
|-------|------|--------|
| admin@gmail.com | admin | terverifikasi |
| umkmanon1@gmail.com | umkm | terverifikasi (+3 produk, 1 alat) |
| umkmanon2@gmail.com | umkm | terverifikasi (target test blokir FR-21) |
| industrianon1@gmail.com | industri | terverifikasi |

## Mereset database test ke kondisi bersih

Cara termudah: jalankan ulang `supabase/seed.sql` (idempotent) lewat **SQL Editor**
di dashboard project ConnectB2B-Test. Untuk benar-benar mengosongkan data hasil test
(request/transaksi yang dibuat saat test), hapus dulu isinya lalu seed ulang —
minta bantuan untuk reset bila perlu.

## Setup untuk database test BARU (mis. dijalankan dosen di akunnya sendiri)

1. Buat project Supabase baru (kosong)
2. SQL Editor → jalankan isi `supabase/migrations/20260101000000_init_schema.sql`
3. SQL Editor → jalankan isi `supabase/seed.sql`
4. Ganti `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.test`
   dengan URL & anon key project baru itu
5. `npx playwright test --headed`
