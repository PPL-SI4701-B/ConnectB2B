-- ============================================================
-- ConnectB2B — Full Database Migration & Fix
-- Jalankan file ini di: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ------------------------------------------------------------
-- STEP 1: Tambah kolom yang hilang di tabel users
-- ------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status_verifikasi public.verifikasi_status NOT NULL DEFAULT 'menunggu',
  ADD COLUMN IF NOT EXISTS is_blocked        boolean                  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by       uuid                     REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at       timestamptz;

-- ------------------------------------------------------------
-- STEP 2: Buat / Replace Trigger Function
-- Trigger ini dipanggil setiap ada user baru mendaftar via Auth.
-- Secara otomatis mengisi tabel: users, umkm, industri
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role             text;
  v_nama             text;
  v_nama_usaha       text;
  v_nama_perusahaan  text;
BEGIN
  -- Ambil metadata dari pendaftaran
  v_role            := NEW.raw_user_meta_data ->> 'role';
  v_nama            := COALESCE(NEW.raw_user_meta_data ->> 'nama', split_part(NEW.email, '@', 1));
  v_nama_usaha      := NEW.raw_user_meta_data ->> 'nama_usaha';
  v_nama_perusahaan := NEW.raw_user_meta_data ->> 'nama_perusahaan';

  -- Validasi role, default ke 'umkm' jika tidak dikenali
  IF v_role NOT IN ('umkm', 'industri', 'admin') THEN
    v_role := 'umkm';
  END IF;

  -- Insert ke public.users
  INSERT INTO public.users (id, email, nama, role, status_verifikasi, is_blocked)
  VALUES (
    NEW.id,
    NEW.email,
    v_nama,
    v_role::public.user_role,
    'menunggu'::public.verifikasi_status,
    false
  )
  ON CONFLICT (id) DO UPDATE
    SET email             = EXCLUDED.email,
        nama              = EXCLUDED.nama,
        role              = EXCLUDED.role;

  -- Insert ke tabel umkm jika role = umkm
  IF v_role = 'umkm' THEN
    INSERT INTO public.umkm (user_id, nama_usaha)
    VALUES (NEW.id, COALESCE(v_nama_usaha, v_nama))
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert ke tabel industri jika role = industri
  IF v_role = 'industri' THEN
    INSERT INTO public.industri (user_id, nama_perusahaan)
    VALUES (NEW.id, COALESCE(v_nama_perusahaan, v_nama))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- STEP 3: Pasang Trigger ke auth.users
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- STEP 4: Pastikan RLS aktif & admin bisa update semua tabel
-- ------------------------------------------------------------

-- Policy: Admin bisa UPDATE semua row di tabel users
DROP POLICY IF EXISTS "Admin can update all users" ON public.users;
CREATE POLICY "Admin can update all users" ON public.users
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Admin bisa UPDATE semua dokumen_legalitas
DROP POLICY IF EXISTS "Admin can update all dokumen" ON public.dokumen_legalitas;
CREATE POLICY "Admin can update all dokumen" ON public.dokumen_legalitas
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Admin bisa INSERT notifikasi untuk user manapun
DROP POLICY IF EXISTS "Admin can insert notifikasi" ON public.notifikasi;
CREATE POLICY "Admin can insert notifikasi" ON public.notifikasi
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- ------------------------------------------------------------
-- STEP 5: Backfill — isi status_verifikasi untuk user lama
-- (Jalankan hanya jika sudah ada data user lama yang perlu diisi)
-- ------------------------------------------------------------
UPDATE public.users
SET status_verifikasi = 'menunggu'
WHERE status_verifikasi IS NULL;

-- ============================================================
-- SELESAI. Refresh halaman Supabase untuk melihat perubahan.
-- ============================================================
