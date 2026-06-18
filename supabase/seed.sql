-- =====================================================================================
-- ConnectB2B — SEED untuk database test (FR-01..FR-29)
-- Membuat akun test + data minimum agar E2E Playwright punya bahan.
-- Idempotent: aman dijalankan ulang (ON CONFLICT DO NOTHING / upsert).
--
-- Akun yang dibuat (password semua: 12345678):
--   admin@gmail.com           -> admin
--   umkmanon1@gmail.com       -> umkm  (terverifikasi, punya produk)  [akun utama UMKM]
--   umkmanon2@gmail.com       -> umkm  (terverifikasi)                [target test blokir FR-21]
--   industrianon1@gmail.com   -> industri (terverifikasi)             [akun utama Industri]
-- =====================================================================================

-- ---------- Kategori (data referensi untuk dropdown) ----------
INSERT INTO public.kategori (id, nama_kategori, deskripsi) VALUES
  (1,'Tekstil','Industri tekstil, garmen, dan bahan kain'),
  (2,'Makanan & Minuman','Produksi makanan, minuman, dan bahan baku pangan'),
  (3,'Elektronik','Komponen elektronik, perangkat, dan aksesoris'),
  (4,'Kerajinan Tangan','Produk kerajinan, handmade, dan seni'),
  (5,'Pertanian','Hasil pertanian, perkebunan, dan agribisnis'),
  (6,'Perikanan','Hasil perikanan, budidaya, dan pengolahan ikan'),
  (7,'Furnitur','Produk furnitur, meubel, dan interior'),
  (8,'Otomotif','Suku cadang, aksesoris, dan komponen otomotif'),
  (9,'Kosmetik & Kecantikan','Produk kecantikan, perawatan, dan kosmetik'),
  (10,'Packaging','Kemasan, packaging, dan bahan baku kemasan'),
  (11,'Logistik & Distribusi','Layanan pengiriman, gudang, dan distribusi'),
  (12,'Teknologi Informasi','Layanan IT, software, dan digital')
ON CONFLICT (id) DO NOTHING;
SELECT setval('kategori_id_seq', (SELECT MAX(id) FROM public.kategori));

-- ---------- platform_config (rekening platform untuk pembayaran) ----------
INSERT INTO public.platform_config (key, value) VALUES
  ('bank_nama','BCA'),
  ('bank_no_rekening','1234567890'),
  ('bank_atas_nama','ConnectB2B Indonesia')
ON CONFLICT (key) DO NOTHING;

-- ---------- Akun test (auth.users + identities). Trigger handle_new_user otomatis bikin profil ----------
DO $$
DECLARE
  v_pass text := crypt('12345678', gen_salt('bf'));
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@gmail.com',         'admin',    '{"role":"admin","nama":"Admin ConnectB2B"}'::jsonb),
      ('00000000-0000-0000-0000-000000000002'::uuid, 'umkmanon1@gmail.com',     'umkm',     '{"role":"umkm","nama":"umkmanon1","nama_usaha":"UMKM Anon Satu"}'::jsonb),
      ('00000000-0000-0000-0000-000000000003'::uuid, 'umkmanon2@gmail.com',     'umkm',     '{"role":"umkm","nama":"umkmanon2","nama_usaha":"UMKM Anon Dua"}'::jsonb),
      ('00000000-0000-0000-0000-000000000004'::uuid, 'industrianon1@gmail.com', 'industri', '{"role":"industri","nama":"industrianon1","nama_perusahaan":"PT Industri Anon Satu"}'::jsonb),
      -- Akun khusus FR-24 (verifikasi dokumen UMKM) — agar test tak perlu signUp (hindari email rate limit)
      ('00000000-0000-0000-0000-000000000005'::uuid, 'fr24-umkm@gmail.com',     'umkm',     '{"role":"umkm","nama":"PT Dummy 24","nama_usaha":"PT Dummy 24"}'::jsonb),
      -- Akun khusus test DOKUMEN (FR-23 upload UMKM, FR-25/26 dokumen Industri) — agar tak mengotori akun bersama
      ('00000000-0000-0000-0000-000000000006'::uuid, 'fr23-umkm@gmail.com',     'umkm',     '{"role":"umkm","nama":"UMKM Dok FR23","nama_usaha":"UMKM Dok FR23"}'::jsonb),
      ('00000000-0000-0000-0000-000000000007'::uuid, 'fr25-industri@gmail.com', 'industri', '{"role":"industri","nama":"Industri Dok FR25","nama_perusahaan":"PT Industri Dok FR25"}'::jsonb),
      ('00000000-0000-0000-0000-000000000008'::uuid, 'fr26-industri@gmail.com', 'industri', '{"role":"industri","nama":"Industri Verif FR26","nama_perusahaan":"PT Industri Verif FR26"}'::jsonb),
      ('00000000-0000-0000-0000-000000000009'::uuid, 'fr27-umkm@gmail.com',     'umkm',     '{"role":"umkm","nama":"UMKM Status FR27","nama_usaha":"UMKM Status FR27"}'::jsonb)
    ) AS t(id, email, role, meta)
  LOOP
    -- auth.users (memicu trigger on_auth_user_created -> public.users + umkm/industri)
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', rec.id, 'authenticated', 'authenticated', rec.email, v_pass,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, rec.meta,
      '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    -- auth.identities (provider email, wajib untuk login password di GoTrue versi baru)
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), rec.id::text, rec.id,
      jsonb_build_object('sub', rec.id::text, 'email', rec.email, 'email_verified', true),
      'email', now(), now(), now()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  END LOOP;
END $$;

-- ---------- Set semua akun test jadi terverifikasi (agar lolos middleware) ----------
UPDATE public.users SET status_verifikasi = 'terverifikasi', verified_at = now()
WHERE email IN ('umkmanon1@gmail.com','umkmanon2@gmail.com','industrianon1@gmail.com',
                'fr24-umkm@gmail.com','fr23-umkm@gmail.com','fr25-industri@gmail.com',
                'fr26-industri@gmail.com','fr27-umkm@gmail.com');

-- Dokumen NIB untuk akun status FR-27 (dipakai uji catatan penolakan)
INSERT INTO public.dokumen_legalitas (user_id, jenis_dokumen, file_url, status_verifikasi)
SELECT '00000000-0000-0000-0000-000000000009','NIB','dummy.pdf','terverifikasi'
WHERE NOT EXISTS (SELECT 1 FROM public.dokumen_legalitas WHERE user_id='00000000-0000-0000-0000-000000000009');

-- Pastikan admin role benar
UPDATE public.users SET role = 'admin', status_verifikasi = 'terverifikasi'
WHERE email = 'admin@gmail.com';

-- ---------- Lengkapi data UMKM (rekening untuk pencairan dana, kategori, alamat) ----------
-- nama_usaha sengaja 'umkmanon1' agar cocok dengan pencarian kartu katalog di FR-18.
UPDATE public.umkm SET
  nama_usaha = 'umkmanon1',
  kategori_id = 1, alamat = 'Jl. Tekstil No. 1, Bandung',
  deskripsi = 'UMKM tekstil untuk keperluan testing E2E.',
  no_rekening = '1112223334', nama_bank = 'BCA', atas_nama_rekening = 'UMKM Anon Satu'
WHERE user_id = '00000000-0000-0000-0000-000000000002';

UPDATE public.umkm SET
  kategori_id = 2, alamat = 'Jl. Pangan No. 2, Surabaya',
  no_rekening = '5556667778', nama_bank = 'BRI', atas_nama_rekening = 'UMKM Anon Dua'
WHERE user_id = '00000000-0000-0000-0000-000000000003';

-- ---------- Lengkapi data Industri ----------
UPDATE public.industri SET kategori_id = 1, lokasi = 'Jakarta'
WHERE user_id = '00000000-0000-0000-0000-000000000004';

-- ---------- Produk milik umkmanon1 (agar katalog/pencarian/keranjang ada isinya) ----------
INSERT INTO public.produk (user_id, nama, deskripsi, kategori, harga, stok, is_active, min_pembelian) VALUES
  ('00000000-0000-0000-0000-000000000002','Kain Katun Premium','Kain katun berkualitas tinggi untuk produksi pakaian','Tekstil', 50000, 1000, true, 10),
  ('00000000-0000-0000-0000-000000000002','Benang Jahit Industri','Benang jahit kuat untuk produksi massal','Tekstil', 15000, 5000, true, 20),
  ('00000000-0000-0000-0000-000000000002','Kain Batik Tulis','Kain batik tulis motif tradisional','Kerajinan Tangan', 120000, 200, true, 5)
ON CONFLICT DO NOTHING;

-- ---------- Equipment/alat milik umkmanon1 (untuk fitur sewa alat) ----------
INSERT INTO public.equipment (user_id, nama, deskripsi, harga_sewa, stok, status, is_active) VALUES
  ('00000000-0000-0000-0000-000000000002','Mesin Jahit High Speed','Mesin jahit industri untuk produksi cepat', 200000, 5, 'tersedia', true)
ON CONFLICT DO NOTHING;

-- ---------- Produk milik umkmanon2 (UMKM TANPA ulasan, untuk FR-18 TC-18-02) ----------
INSERT INTO public.produk (user_id, nama, deskripsi, kategori, harga, stok, is_active, min_pembelian)
SELECT '00000000-0000-0000-0000-000000000003','Tepung Terigu Premium','Tepung untuk produksi roti','Makanan & Minuman', 12000, 3000, true, 50
WHERE NOT EXISTS (SELECT 1 FROM public.produk WHERE user_id = '00000000-0000-0000-0000-000000000003');

-- ---------- Ulasan untuk umkmanon1 agar punya rating (FR-18 TC-18-01): 4,5,5 -> avg 4.7 ----------
DO $$
DECLARE
  v_umkm_id int; v_ind_id int; v_req_id int; v_trx_id int; r int;
  arr int[] := ARRAY[4,5,5];
BEGIN
  SELECT id INTO v_umkm_id FROM public.umkm WHERE user_id = '00000000-0000-0000-0000-000000000002';
  SELECT id INTO v_ind_id  FROM public.industri WHERE user_id = '00000000-0000-0000-0000-000000000004';
  IF NOT EXISTS (
    SELECT 1 FROM public.ulasan u JOIN public.transaksi t ON t.id=u.transaksi_id
    JOIN public.request rq ON rq.id=t.request_id WHERE rq.umkm_id = v_umkm_id
  ) THEN
    FOREACH r IN ARRAY arr LOOP
      INSERT INTO public.request (umkm_id, industri_id, status, pesan, kuantitas)
      VALUES (v_umkm_id, v_ind_id, 'approve', 'SEED_ULASAN', 1) RETURNING id INTO v_req_id;
      INSERT INTO public.transaksi (request_id, status, status_validasi, progress_status, tanggal_selesai)
      VALUES (v_req_id, 'lunas', 'valid', 'Selesai', CURRENT_DATE) RETURNING id INTO v_trx_id;
      INSERT INTO public.ulasan (transaksi_id, rating, komentar) VALUES (v_trx_id, r, 'Seed ulasan');
    END LOOP;
  END IF;
END $$;
