-- =====================================================================================
-- ConnectB2B — SKEMA LENGKAP (untuk database baru/kosong)
-- Dihasilkan dari introspeksi project produksi. Aman dijalankan di DB Supabase kosong.
-- Urutan: extensions -> enums -> tables -> foreign keys -> functions -> triggers
--         -> RLS + policies -> grants -> storage buckets
-- =====================================================================================

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_salt/crypt (dipakai saat seeding akun)

-- ---------- Enums ----------
CREATE TYPE public.equipment_status  AS ENUM ('tersedia', 'tidak tersedia');
CREATE TYPE public.katalog_type      AS ENUM ('produk', 'equipment');
CREATE TYPE public.laporan_severity  AS ENUM ('berat', 'ringan');
CREATE TYPE public.laporan_status    AS ENUM ('pending', 'dihapus', 'diabaikan');
CREATE TYPE public.notifikasi_status AS ENUM ('belum dibaca', 'dibaca');
CREATE TYPE public.pembayaran_status AS ENUM ('pending', 'berhasil', 'gagal');
CREATE TYPE public.request_status    AS ENUM ('pending', 'approve', 'ditolak');
CREATE TYPE public.transaksi_status  AS ENUM ('belum lunas', 'lunas');
CREATE TYPE public.user_role         AS ENUM ('industri', 'umkm', 'admin');
CREATE TYPE public.validasi_status   AS ENUM ('menunggu', 'valid', 'tidak valid');
CREATE TYPE public.verifikasi_status AS ENUM ('menunggu', 'terverifikasi', 'ditolak');

-- ---------- Tables ----------
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  nama text NOT NULL,
  email text NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'umkm',
  created_at timestamptz NOT NULL DEFAULT now(),
  status_verifikasi public.verifikasi_status NOT NULL DEFAULT 'menunggu',
  verified_at timestamptz,
  verified_by uuid,
  is_blocked boolean NOT NULL DEFAULT false
);

CREATE TABLE public.kategori (
  id serial PRIMARY KEY,
  nama_kategori text NOT NULL,
  deskripsi text
);

CREATE TABLE public.umkm (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  kategori_id integer,
  nama_usaha text NOT NULL,
  alamat text,
  deskripsi text,
  no_rekening text,
  nama_bank text,
  atas_nama_rekening text
);

CREATE TABLE public.industri (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  kategori_id integer,
  nama_perusahaan text NOT NULL,
  lokasi text
);

CREATE TABLE public.produk (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  nama text NOT NULL,
  deskripsi text,
  kategori text,
  harga numeric DEFAULT 0,
  stok integer DEFAULT 0,
  gambar_url text,
  is_active boolean NOT NULL DEFAULT true,
  min_pembelian integer NOT NULL DEFAULT 1
);

CREATE TABLE public.equipment (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  nama text NOT NULL,
  deskripsi text,
  harga_sewa numeric DEFAULT 0,
  stok integer DEFAULT 0,
  status public.equipment_status DEFAULT 'tersedia',
  gambar_url text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.profiles (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  deskripsi text,
  kontak text,
  lokasi text
);

CREATE TABLE public.dokumen_legalitas (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  jenis_dokumen text NOT NULL,
  file_url text NOT NULL,
  status_verifikasi public.verifikasi_status NOT NULL DEFAULT 'menunggu',
  catatan_admin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_jenis_dokumen CHECK (jenis_dokumen = ANY (ARRAY['NIB','NPWP','SIUP','IUT','Lainnya'])),
  CONSTRAINT unique_user_jenis_dokumen UNIQUE (user_id, jenis_dokumen)
);

CREATE TABLE public.keranjang (
  id serial PRIMARY KEY,
  industri_id integer,
  produk_id integer,
  equipment_id integer,
  kuantitas integer NOT NULL DEFAULT 1,
  umkm_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT keranjang_item_check CHECK ((produk_id IS NOT NULL) OR (equipment_id IS NOT NULL)),
  CONSTRAINT keranjang_owner_check CHECK (((industri_id IS NOT NULL) AND (umkm_id IS NULL)) OR ((industri_id IS NULL) AND (umkm_id IS NOT NULL)))
);

CREATE TABLE public.request (
  id serial PRIMARY KEY,
  produk_id integer,
  equipment_id integer,
  industri_id integer,
  umkm_id integer NOT NULL,
  tanggal_request timestamptz NOT NULL DEFAULT now(),
  status public.request_status NOT NULL DEFAULT 'pending',
  pesan text,
  sender_umkm_id bigint,
  kuantitas integer NOT NULL DEFAULT 1,
  CONSTRAINT request_kuantitas_positive CHECK (kuantitas >= 1)
);

CREATE TABLE public.transaksi (
  id serial PRIMARY KEY,
  request_id integer NOT NULL UNIQUE,
  admin_id uuid,
  tanggal_mulai date NOT NULL DEFAULT CURRENT_DATE,
  tanggal_selesai date,
  status public.transaksi_status NOT NULL DEFAULT 'belum lunas',
  status_validasi public.validasi_status NOT NULL DEFAULT 'menunggu',
  progress_status text NOT NULL DEFAULT 'Menunggu Material',
  bukti_pengiriman_umkm text,
  konfirmasi_penerimaan boolean DEFAULT false
);

CREATE TABLE public.detail_transaksi (
  id serial PRIMARY KEY,
  transaksi_id integer NOT NULL,
  produk_id integer,
  equipment_id integer,
  kuantitas integer NOT NULL DEFAULT 1,
  harga_satuan numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0
);

CREATE TABLE public.pembayaran (
  id serial PRIMARY KEY,
  transaksi_id integer NOT NULL,
  tanggal_bayar timestamptz NOT NULL DEFAULT now(),
  bukti_transfer text,
  status public.pembayaran_status NOT NULL DEFAULT 'pending',
  bukti_pengiriman text,
  status_pengiriman text NOT NULL DEFAULT 'menunggu',
  bukti_pembayaran_umkm text,
  status_pencairan text NOT NULL DEFAULT 'menunggu',
  bukti_terima_umkm text,
  jumlah_transfer numeric,
  catatan_admin text
);

CREATE TABLE public.transaksi_history (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  transaksi_id bigint NOT NULL,
  status_progress text NOT NULL,
  pesan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ulasan (
  id serial PRIMARY KEY,
  transaksi_id integer NOT NULL,
  rating integer NOT NULL,
  komentar text,
  tanggal timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ulasan_rating_check CHECK (rating >= 1 AND rating <= 5)
);

CREATE TABLE public.notifikasi (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  pesan text NOT NULL,
  status public.notifikasi_status NOT NULL DEFAULT 'belum dibaca',
  tanggal timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.laporan_konten (
  id serial PRIMARY KEY,
  katalog_type public.katalog_type NOT NULL DEFAULT 'produk',
  katalog_id integer NOT NULL,
  pelapor text NOT NULL,
  alasan text NOT NULL,
  severity public.laporan_severity NOT NULL DEFAULT 'ringan',
  status public.laporan_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.platform_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ---------- Foreign keys ----------
ALTER TABLE public.users            ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.users            ADD CONSTRAINT users_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.umkm             ADD CONSTRAINT umkm_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.umkm             ADD CONSTRAINT umkm_kategori_id_fkey FOREIGN KEY (kategori_id) REFERENCES public.kategori(id) ON DELETE SET NULL;
ALTER TABLE public.industri         ADD CONSTRAINT industri_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.industri         ADD CONSTRAINT industri_kategori_id_fkey FOREIGN KEY (kategori_id) REFERENCES public.kategori(id) ON DELETE SET NULL;
ALTER TABLE public.produk           ADD CONSTRAINT produk_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.equipment        ADD CONSTRAINT equipment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles         ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.dokumen_legalitas ADD CONSTRAINT dokumen_legalitas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.keranjang        ADD CONSTRAINT keranjang_industri_id_fkey FOREIGN KEY (industri_id) REFERENCES public.industri(id) ON DELETE CASCADE;
ALTER TABLE public.keranjang        ADD CONSTRAINT keranjang_produk_id_fkey FOREIGN KEY (produk_id) REFERENCES public.produk(id) ON DELETE CASCADE;
ALTER TABLE public.keranjang        ADD CONSTRAINT keranjang_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;
ALTER TABLE public.keranjang        ADD CONSTRAINT keranjang_umkm_id_fkey FOREIGN KEY (umkm_id) REFERENCES public.umkm(id);
ALTER TABLE public.request          ADD CONSTRAINT request_produk_id_fkey FOREIGN KEY (produk_id) REFERENCES public.produk(id) ON DELETE SET NULL;
ALTER TABLE public.request          ADD CONSTRAINT request_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE SET NULL;
ALTER TABLE public.request          ADD CONSTRAINT request_industri_id_fkey FOREIGN KEY (industri_id) REFERENCES public.industri(id) ON DELETE SET NULL;
ALTER TABLE public.request          ADD CONSTRAINT request_umkm_id_fkey FOREIGN KEY (umkm_id) REFERENCES public.umkm(id) ON DELETE CASCADE;
ALTER TABLE public.request          ADD CONSTRAINT request_sender_umkm_id_fkey FOREIGN KEY (sender_umkm_id) REFERENCES public.umkm(id);
ALTER TABLE public.transaksi        ADD CONSTRAINT transaksi_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.request(id) ON DELETE CASCADE;
ALTER TABLE public.transaksi        ADD CONSTRAINT transaksi_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.detail_transaksi ADD CONSTRAINT detail_transaksi_transaksi_id_fkey FOREIGN KEY (transaksi_id) REFERENCES public.transaksi(id) ON DELETE CASCADE;
ALTER TABLE public.detail_transaksi ADD CONSTRAINT detail_transaksi_produk_id_fkey FOREIGN KEY (produk_id) REFERENCES public.produk(id) ON DELETE SET NULL;
ALTER TABLE public.detail_transaksi ADD CONSTRAINT detail_transaksi_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE SET NULL;
ALTER TABLE public.pembayaran       ADD CONSTRAINT pembayaran_transaksi_id_fkey FOREIGN KEY (transaksi_id) REFERENCES public.transaksi(id) ON DELETE CASCADE;
ALTER TABLE public.transaksi_history ADD CONSTRAINT transaksi_history_transaksi_id_fkey FOREIGN KEY (transaksi_id) REFERENCES public.transaksi(id) ON DELETE CASCADE;
ALTER TABLE public.ulasan           ADD CONSTRAINT ulasan_transaksi_id_fkey FOREIGN KEY (transaksi_id) REFERENCES public.transaksi(id) ON DELETE CASCADE;
ALTER TABLE public.notifikasi       ADD CONSTRAINT notifikasi_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ---------- Functions ----------
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select role from public.users where id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_role             text;
  v_nama             text;
  v_nama_usaha       text;
  v_nama_perusahaan  text;
BEGIN
  v_role            := NEW.raw_user_meta_data ->> 'role';
  v_nama            := COALESCE(NEW.raw_user_meta_data ->> 'nama', split_part(NEW.email, '@', 1));
  v_nama_usaha      := NEW.raw_user_meta_data ->> 'nama_usaha';
  v_nama_perusahaan := NEW.raw_user_meta_data ->> 'nama_perusahaan';

  IF v_role NOT IN ('umkm', 'industri', 'admin') THEN
    v_role := 'umkm';
  END IF;

  INSERT INTO public.users (id, email, nama, role, status_verifikasi, is_blocked)
  VALUES (NEW.id, NEW.email, v_nama, v_role::public.user_role, 'menunggu'::public.verifikasi_status, false)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, nama = EXCLUDED.nama, role = EXCLUDED.role;

  IF v_role = 'umkm' THEN
    INSERT INTO public.umkm (user_id, nama_usaha)
    VALUES (NEW.id, COALESCE(v_nama_usaha, v_nama)) ON CONFLICT DO NOTHING;
  END IF;

  IF v_role = 'industri' THEN
    INSERT INTO public.industri (user_id, nama_perusahaan)
    VALUES (NEW.id, COALESCE(v_nama_perusahaan, v_nama)) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_dokumen_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() = OLD.user_id AND NOT public.is_admin() THEN
        NEW.status_verifikasi = OLD.status_verifikasi;
        NEW.catatan_admin = OLD.catatan_admin;
        NEW.user_id = OLD.user_id;
        IF NEW.file_url IS DISTINCT FROM OLD.file_url THEN
            NEW.status_verifikasi = 'menunggu';
            NEW.catatan_admin = NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_verification_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_has_ditolak boolean;
    v_has_menunggu_or_missing boolean;
    v_doc_count integer;
BEGIN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    SELECT BOOL_OR(status_verifikasi = 'ditolak'),
           BOOL_OR(status_verifikasi = 'menunggu'),
           COUNT(*)
    INTO v_has_ditolak, v_has_menunggu_or_missing, v_doc_count
    FROM public.dokumen_legalitas WHERE user_id = v_user_id;

    IF v_has_ditolak THEN
        UPDATE public.users SET status_verifikasi = 'ditolak'
        WHERE id = v_user_id AND status_verifikasi != 'ditolak';
    ELSIF NOT COALESCE(v_has_menunggu_or_missing, true) AND v_doc_count > 0 THEN
        UPDATE public.users SET status_verifikasi = 'terverifikasi', verified_at = NOW(),
            verified_by = CASE WHEN public.is_admin() THEN auth.uid() ELSE verified_by END
        WHERE id = v_user_id AND status_verifikasi != 'terverifikasi';
    ELSE
        UPDATE public.users SET status_verifikasi = 'menunggu'
        WHERE id = v_user_id AND status_verifikasi != 'menunggu';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.kirim_notifikasi(p_target_user_id uuid, p_pesan text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_target_user_id) THEN RAISE EXCEPTION 'Target user not found'; END IF;
  IF p_pesan IS NULL OR trim(p_pesan) = '' THEN RAISE EXCEPTION 'Message cannot be empty'; END IF;
  INSERT INTO public.notifikasi (user_id, pesan, status) VALUES (p_target_user_id, p_pesan, 'belum dibaca');
END;
$function$;

CREATE OR REPLACE FUNCTION public.konfirmasi_pesanan_selesai(p_transaksi_id integer)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_caller_industri_id  integer;
  v_industri_nama       text;
  v_request_id          integer;
  v_umkm_user_id        uuid;
BEGIN
  SELECT id, nama_perusahaan INTO v_caller_industri_id, v_industri_nama
    FROM public.industri WHERE user_id = auth.uid();
  IF v_caller_industri_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Hanya Industri yang dapat mengkonfirmasi pesanan selesai.');
  END IF;
  SELECT t.request_id, u.user_id INTO v_request_id, v_umkm_user_id
    FROM public.transaksi t
    JOIN public.request r ON r.id = t.request_id
    JOIN public.umkm u ON u.id = r.umkm_id
   WHERE t.id = p_transaksi_id AND r.industri_id = v_caller_industri_id;
  IF v_request_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Transaksi tidak ditemukan atau bukan milik Anda.');
  END IF;
  UPDATE public.transaksi SET tanggal_selesai = CURRENT_DATE, progress_status = 'Selesai' WHERE id = p_transaksi_id;
  INSERT INTO public.notifikasi (user_id, pesan, status)
  VALUES (v_umkm_user_id,
    format('Industri %s telah mengkonfirmasi pesanan selesai. Terima kasih atas kerja samanya!', v_industri_nama),
    'belum dibaca');
  RETURN json_build_object('success', true, 'transaksi_id', p_transaksi_id);
END;
$function$;

-- ---------- Triggers ----------
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_check_dokumen_update
  BEFORE UPDATE ON public.dokumen_legalitas FOR EACH ROW EXECUTE FUNCTION public.check_dokumen_update();

CREATE TRIGGER trg_sync_user_verification
  AFTER INSERT OR UPDATE OR DELETE ON public.dokumen_legalitas FOR EACH ROW EXECUTE FUNCTION public.sync_user_verification_status();

-- ---------- Enable RLS ----------
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umkm              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industri          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dokumen_legalitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keranjang         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_transaksi  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembayaran        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ulasan            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifikasi        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan_konten    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config   ENABLE ROW LEVEL SECURITY;

-- ---------- Policies ----------
-- users
CREATE POLICY users_select_public ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_insert_own ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING ((auth.uid() = id) OR public.is_admin());
CREATE POLICY "Admin can update all users" ON public.users FOR UPDATE TO authenticated USING ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'admin');

-- kategori
CREATE POLICY kategori_select_public ON public.kategori FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY kategori_admin_insert ON public.kategori FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY kategori_admin_update ON public.kategori FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY kategori_admin_delete ON public.kategori FOR DELETE TO authenticated USING (public.is_admin());

-- umkm
CREATE POLICY umkm_select_public ON public.umkm FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY umkm_insert_own ON public.umkm FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY umkm_update_own ON public.umkm FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());
CREATE POLICY umkm_delete_own ON public.umkm FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());

-- industri
CREATE POLICY industri_select_public ON public.industri FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY industri_insert_own ON public.industri FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY industri_update_own ON public.industri FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());
CREATE POLICY industri_delete_own ON public.industri FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());

-- produk
CREATE POLICY produk_select_public ON public.produk FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY produk_insert_own ON public.produk FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY produk_update_own ON public.produk FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());
CREATE POLICY produk_delete_own ON public.produk FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());

-- equipment
CREATE POLICY equipment_select_public ON public.equipment FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY equipment_insert_own ON public.equipment FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY equipment_update_own ON public.equipment FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());
CREATE POLICY equipment_delete_own ON public.equipment FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());

-- profiles
CREATE POLICY profiles_select_public ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());
CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());

-- dokumen_legalitas
CREATE POLICY dok_select ON public.dokumen_legalitas FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR public.is_admin());
CREATE POLICY dok_insert ON public.dokumen_legalitas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY dok_update ON public.dokumen_legalitas FOR UPDATE TO authenticated USING ((user_id = auth.uid()) OR public.is_admin());
CREATE POLICY dok_delete ON public.dokumen_legalitas FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR public.is_admin());
CREATE POLICY "Admin can update all dokumen" ON public.dokumen_legalitas FOR UPDATE TO authenticated USING ((SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'admin');

-- keranjang
CREATE POLICY keranjang_select_own ON public.keranjang FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM public.industri WHERE industri.id = keranjang.industri_id AND industri.user_id = auth.uid())) OR public.is_admin());
CREATE POLICY keranjang_insert_own ON public.keranjang FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.industri WHERE industri.id = keranjang.industri_id AND industri.user_id = auth.uid()));
CREATE POLICY keranjang_update_own ON public.keranjang FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM public.industri WHERE industri.id = keranjang.industri_id AND industri.user_id = auth.uid())) OR public.is_admin());
CREATE POLICY keranjang_delete_own ON public.keranjang FOR DELETE TO authenticated USING ((EXISTS (SELECT 1 FROM public.industri WHERE industri.id = keranjang.industri_id AND industri.user_id = auth.uid())) OR public.is_admin());

-- request
CREATE POLICY request_select_involved ON public.request FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM public.umkm WHERE umkm.id = request.umkm_id AND umkm.user_id = auth.uid())) OR (EXISTS (SELECT 1 FROM public.industri WHERE industri.id = request.industri_id AND industri.user_id = auth.uid())) OR public.is_admin());
CREATE POLICY request_select_sender_umkm ON public.request FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.umkm WHERE umkm.id = request.sender_umkm_id AND umkm.user_id = auth.uid()));
CREATE POLICY request_insert_industri ON public.request FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM public.industri WHERE industri.id = request.industri_id AND industri.user_id = auth.uid())) OR public.is_admin());
CREATE POLICY request_insert_umkm ON public.request FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.umkm WHERE umkm.id = request.sender_umkm_id AND umkm.user_id = auth.uid()));
CREATE POLICY request_update_involved ON public.request FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM public.umkm WHERE umkm.id = request.umkm_id AND umkm.user_id = auth.uid())) OR (EXISTS (SELECT 1 FROM public.industri WHERE industri.id = request.industri_id AND industri.user_id = auth.uid())) OR public.is_admin());
CREATE POLICY request_update_sender_umkm ON public.request FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.umkm WHERE umkm.id = request.sender_umkm_id AND umkm.user_id = auth.uid()));

-- transaksi
CREATE POLICY transaksi_select_involved ON public.transaksi FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM public.request r LEFT JOIN public.umkm u ON u.id = r.umkm_id LEFT JOIN public.industri i ON i.id = r.industri_id WHERE r.id = transaksi.request_id AND ((u.user_id = auth.uid()) OR (i.user_id = auth.uid())))) OR public.is_admin());
CREATE POLICY transaksi_select_sender_umkm ON public.transaksi FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.request r JOIN public.umkm u ON u.id = r.sender_umkm_id WHERE r.id = transaksi.request_id AND u.user_id = auth.uid()));
CREATE POLICY transaksi_insert_admin ON public.transaksi FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY transaksi_insert_umkm ON public.transaksi FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.request r JOIN public.umkm u ON u.id = r.umkm_id WHERE r.id = transaksi.request_id AND u.user_id = auth.uid()));
CREATE POLICY transaksi_update_industri ON public.transaksi FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM public.request r JOIN public.industri i ON i.id = r.industri_id WHERE r.id = transaksi.request_id AND i.user_id = auth.uid())) OR public.is_admin());
CREATE POLICY transaksi_update_umkm ON public.transaksi FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.request r JOIN public.umkm u ON u.id = r.umkm_id WHERE r.id = transaksi.request_id AND u.user_id = auth.uid()));

-- detail_transaksi
CREATE POLICY detail_transaksi_select_involved ON public.detail_transaksi FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON r.id = t.request_id LEFT JOIN public.umkm u ON u.id = r.umkm_id LEFT JOIN public.industri i ON i.id = r.industri_id WHERE t.id = detail_transaksi.transaksi_id AND ((u.user_id = auth.uid()) OR (i.user_id = auth.uid())))) OR public.is_admin());
CREATE POLICY detail_transaksi_insert_umkm ON public.detail_transaksi FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON r.id = t.request_id JOIN public.umkm u ON u.id = r.umkm_id WHERE t.id = detail_transaksi.transaksi_id AND u.user_id = auth.uid()));
CREATE POLICY detail_transaksi_manage_admin ON public.detail_transaksi FOR ALL TO authenticated USING (public.is_admin());

-- pembayaran
CREATE POLICY pembayaran_select_involved ON public.pembayaran FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON r.id = t.request_id LEFT JOIN public.umkm u ON u.id = r.umkm_id LEFT JOIN public.industri i ON i.id = r.industri_id WHERE t.id = pembayaran.transaksi_id AND ((u.user_id = auth.uid()) OR (i.user_id = auth.uid())))) OR public.is_admin());
CREATE POLICY pembayaran_insert_involved ON public.pembayaran FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON r.id = t.request_id LEFT JOIN public.industri i ON i.id = r.industri_id WHERE t.id = pembayaran.transaksi_id AND i.user_id = auth.uid())) OR public.is_admin());
CREATE POLICY pembayaran_update_admin ON public.pembayaran FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY umkm_update_own_pembayaran ON public.pembayaran FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON r.id = t.request_id JOIN public.umkm u ON u.id = r.umkm_id WHERE t.id = pembayaran.transaksi_id AND u.user_id = auth.uid()));
CREATE POLICY industri_update_own_failed_pembayaran ON public.pembayaran FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON r.id = t.request_id JOIN public.industri i ON i.id = r.industri_id WHERE t.id = pembayaran.transaksi_id AND i.user_id = auth.uid() AND pembayaran.status = 'gagal'));

-- transaksi_history
CREATE POLICY history_select ON public.transaksi_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON t.request_id = r.id LEFT JOIN public.umkm u ON r.umkm_id = u.id LEFT JOIN public.industri i ON r.industri_id = i.id WHERE t.id = transaksi_history.transaksi_id AND ((u.user_id = auth.uid()) OR (i.user_id = auth.uid()) OR public.is_admin())));
CREATE POLICY history_insert_umkm ON public.transaksi_history FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON t.request_id = r.id JOIN public.umkm u ON r.umkm_id = u.id WHERE t.id = transaksi_history.transaksi_id AND u.user_id = auth.uid()));

-- ulasan
CREATE POLICY ulasan_select_public ON public.ulasan FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ulasan_insert_involved ON public.ulasan FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON r.id = t.request_id LEFT JOIN public.umkm u ON u.id = r.umkm_id LEFT JOIN public.industri i ON i.id = r.industri_id WHERE t.id = ulasan.transaksi_id AND ((u.user_id = auth.uid()) OR (i.user_id = auth.uid()))));
CREATE POLICY ulasan_update_own ON public.ulasan FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM public.transaksi t JOIN public.request r ON r.id = t.request_id LEFT JOIN public.umkm u ON u.id = r.umkm_id LEFT JOIN public.industri i ON i.id = r.industri_id WHERE t.id = ulasan.transaksi_id AND ((u.user_id = auth.uid()) OR (i.user_id = auth.uid())))) OR public.is_admin());

-- notifikasi
CREATE POLICY notifikasi_select_own ON public.notifikasi FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());
CREATE POLICY notifikasi_insert_self_or_admin ON public.notifikasi FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()) OR public.is_admin());
CREATE POLICY notifikasi_update_own ON public.notifikasi FOR UPDATE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());
CREATE POLICY notifikasi_delete_own ON public.notifikasi FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR public.is_admin());

-- laporan_konten
CREATE POLICY "Siapapun dapat membuat laporan_konten baru" ON public.laporan_konten FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admin dapat melihat seluruh laporan_konten" ON public.laporan_konten FOR SELECT TO public USING (public.is_admin());
CREATE POLICY "Admin dapat mengelola laporan_konten" ON public.laporan_konten FOR ALL TO public USING (public.is_admin());

-- platform_config
CREATE POLICY platform_config_read_all ON public.platform_config FOR SELECT TO public USING (true);
CREATE POLICY platform_config_admin_write ON public.platform_config FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- ---------- Grants (agar role anon/authenticated bisa akses; RLS tetap membatasi baris) ----------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ---------- Storage buckets ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('produk-images',     'produk-images',     true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('dokumen-legalitas', 'dokumen-legalitas', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png']),
  ('bukti-transfer',    'bukti-transfer',    false, 5242880,  ARRAY['image/jpeg','image/png','application/pdf']),
  ('dokumen',           'dokumen',           false, 10485760, ARRAY['application/pdf','image/jpeg','image/png']),
  ('avatars',           'avatars',           true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('documents',         'documents',         false, NULL,     NULL)
ON CONFLICT (id) DO NOTHING;

-- ---------- Views (dipakai katalog rating & halaman admin verifikasi) ----------
CREATE OR REPLACE VIEW public.umkm_rating_summary AS
  SELECT r.umkm_id, round(avg(u.rating), 1) AS avg_rating, count(u.id) AS total_ulasan
  FROM ((public.ulasan u
    JOIN public.transaksi t ON t.id = u.transaksi_id)
    JOIN public.request r ON r.id = t.request_id)
  GROUP BY r.umkm_id;

CREATE OR REPLACE VIEW public.pending_verifications AS
  SELECT u.id AS user_id, u.email, u.role,
    COALESCE(um.nama_usaha, ind.nama_perusahaan, u.nama) AS nama_entitas,
    u.status_verifikasi AS user_status,
    json_agg(json_build_object('id', d.id, 'jenis_dokumen', d.jenis_dokumen, 'file_url', d.file_url, 'status', d.status_verifikasi, 'catatan', d.catatan_admin)) AS dokumen_list
  FROM (((public.users u
    LEFT JOIN public.umkm um ON u.id = um.user_id)
    LEFT JOIN public.industri ind ON u.id = ind.user_id)
    LEFT JOIN public.dokumen_legalitas d ON u.id = d.user_id)
  WHERE u.status_verifikasi = 'menunggu'::public.verifikasi_status
  GROUP BY u.id, u.email, u.role, um.nama_usaha, ind.nama_perusahaan, u.status_verifikasi;

GRANT SELECT ON public.umkm_rating_summary, public.pending_verifications TO anon, authenticated, service_role;

-- ---------- Storage object policies (RLS untuk upload/baca file) ----------
CREATE POLICY "avatars: public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "avatars: authenticated upload own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars: authenticated update own folder" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "bukti_transfer_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bukti-transfer' AND (((storage.foldername(name))[1] = auth.uid()::text) OR public.is_admin()));
CREATE POLICY "bukti_transfer_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bukti-transfer' AND (((storage.foldername(name))[1] = auth.uid()::text) OR public.is_admin()));
CREATE POLICY "bukti_transfer_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bukti-transfer' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documents: admin read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND public.is_admin());
CREATE POLICY "documents: authenticated update own folder" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documents: authenticated upload own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documents: owner read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dokumen_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dokumen-legalitas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dokumen_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dokumen-legalitas' AND (((storage.foldername(name))[1] = auth.uid()::text) OR public.is_admin()));
CREATE POLICY "dokumen_owner_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'dokumen-legalitas' AND (((storage.foldername(name))[1] = auth.uid()::text) OR public.is_admin()));
CREATE POLICY "dokumen_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dokumen-legalitas' AND (((storage.foldername(name))[1] = auth.uid()::text) OR public.is_admin()));
CREATE POLICY "dokumen_insert_path" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dokumen' AND (storage.foldername(name))[1] = public.get_user_role()::text AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "dokumen_read_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'dokumen' AND (((storage.foldername(name))[2] = auth.uid()::text) OR public.is_admin()));
CREATE POLICY "dokumen_delete_admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dokumen' AND public.is_admin());
CREATE POLICY "produk_images_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'produk-images');
CREATE POLICY "produk_images_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produk-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "produk_images_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'produk-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "produk_images_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'produk-images' AND (storage.foldername(name))[1] = auth.uid()::text);
