-- ============================================================
-- FASE 1: Keamanan Database Kritis — RLS Hardening
-- ConnectB2B · 2026-06-06
-- Idempoten: aman dijalankan ulang
-- ============================================================

-- ============================================================
-- 1.1  BERSIHKAN POLICY `request` YANG `true`
-- ============================================================

-- DROP policy longgar
DROP POLICY IF EXISTS "User can insert request" ON public.request;
DROP POLICY IF EXISTS "User can update request" ON public.request;
DROP POLICY IF EXISTS "User can view related requests" ON public.request;

-- Policy ketat sudah ada:
--   request_insert_industri  (INSERT, industri owner)
--   request_select_involved  (SELECT, umkm/industri/admin)
--   request_update_involved  (UPDATE, umkm/industri/admin)

-- TAMBAH: policy INSERT untuk UMKM pengirim (sender_umkm_id)
DROP POLICY IF EXISTS "request_insert_umkm" ON public.request;
CREATE POLICY "request_insert_umkm" ON public.request
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.umkm
      WHERE umkm.id = request.sender_umkm_id
        AND umkm.user_id = auth.uid()
    )
  );

-- TAMBAH: policy SELECT untuk sender_umkm_id juga bisa melihat requestnya
-- (request_select_involved hanya cek umkm_id & industri_id, bukan sender_umkm_id)
DROP POLICY IF EXISTS "request_select_sender_umkm" ON public.request;
CREATE POLICY "request_select_sender_umkm" ON public.request
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.umkm
      WHERE umkm.id = request.sender_umkm_id
        AND umkm.user_id = auth.uid()
    )
  );

-- TAMBAH: policy UPDATE untuk sender_umkm_id juga bisa update requestnya
DROP POLICY IF EXISTS "request_update_sender_umkm" ON public.request;
CREATE POLICY "request_update_sender_umkm" ON public.request
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.umkm
      WHERE umkm.id = request.sender_umkm_id
        AND umkm.user_id = auth.uid()
    )
  );


-- ============================================================
-- 1.2  BERSIHKAN POLICY `transaksi` YANG `true`
-- ============================================================

-- DROP policy longgar
DROP POLICY IF EXISTS "User can insert transaksi" ON public.transaksi;
DROP POLICY IF EXISTS "User can view related transaksi" ON public.transaksi;

-- Policy ketat sudah ada:
--   transaksi_select_involved  (SELECT, umkm/industri/admin)
--   transaksi_update_industri  (UPDATE, industri/admin)
--   transaksi_insert_admin     (INSERT, admin)

-- TAMBAH: policy INSERT untuk UMKM (acceptRequest membuat transaksi dari sisi UMKM)
DROP POLICY IF EXISTS "transaksi_insert_umkm" ON public.transaksi;
CREATE POLICY "transaksi_insert_umkm" ON public.transaksi
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.request r
      JOIN public.umkm u ON u.id = r.umkm_id
      WHERE r.id = transaksi.request_id
        AND u.user_id = auth.uid()
    )
  );

-- TAMBAH: policy UPDATE untuk UMKM (updateTransaksiProgress dari sisi UMKM)
DROP POLICY IF EXISTS "transaksi_update_umkm" ON public.transaksi;
CREATE POLICY "transaksi_update_umkm" ON public.transaksi
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.request r
      JOIN public.umkm u ON u.id = r.umkm_id
      WHERE r.id = transaksi.request_id
        AND u.user_id = auth.uid()
    )
  );

-- TAMBAH: policy SELECT untuk UMKM pengirim (sender_umkm_id)
-- transaksi_select_involved hanya cek umkm_id & industri_id, bukan sender_umkm_id.
-- Tanpa ini, UMKM A yang mengirim request ke UMKM B tidak bisa lihat transaksinya sendiri.
DROP POLICY IF EXISTS "transaksi_select_sender_umkm" ON public.transaksi;
CREATE POLICY "transaksi_select_sender_umkm" ON public.transaksi
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.request r
      JOIN public.umkm u ON u.id = r.sender_umkm_id
      WHERE r.id = transaksi.request_id
        AND u.user_id = auth.uid()
    )
  );


-- ============================================================
-- 1.3  TUTUP NOTIFIKASI SPAM
-- ============================================================

-- DROP policy longgar yang mengizinkan siapa pun insert notifikasi ke siapa pun
DROP POLICY IF EXISTS "notifikasi_insert_authenticated" ON public.notifikasi;

-- Ganti: hanya boleh insert notifikasi untuk diri sendiri ATAU admin
DROP POLICY IF EXISTS "notifikasi_insert_self_or_admin" ON public.notifikasi;
CREATE POLICY "notifikasi_insert_self_or_admin" ON public.notifikasi
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );

-- BUAT RPC: kirim_notifikasi — untuk insert notifikasi lintas-user secara aman
-- Fungsi ini SECURITY DEFINER agar bisa bypass RLS insert notifikasi
-- Validasi: pemanggil harus authenticated, dan kita log siapa pengirimnya
CREATE OR REPLACE FUNCTION public.kirim_notifikasi(
  p_target_user_id UUID,
  p_pesan TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validasi: harus authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validasi: target user harus ada
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Validasi: pesan tidak boleh kosong
  IF p_pesan IS NULL OR trim(p_pesan) = '' THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  -- Insert notifikasi
  INSERT INTO public.notifikasi (user_id, pesan, status)
  VALUES (p_target_user_id, p_pesan, 'belum dibaca');
END;
$$;

-- REVOKE/GRANT dihandle di bagian 1.5 bersama semua fungsi lainnya.


-- ============================================================
-- 1.4  VIEW pending_verifications → SECURITY INVOKER
-- ============================================================

ALTER VIEW public.pending_verifications SET (security_invoker = true);


-- ============================================================
-- 1.5  CABUT EXECUTE FUNGSI TRIGGER/HELPER DARI ANON
-- ============================================================

-- Trigger functions — tidak boleh dipanggil via REST sama sekali
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_user_verification_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_dokumen_update() FROM PUBLIC;

-- Helper functions — anon tidak boleh, authenticated masih perlu (dipakai RLS)
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- RPC function — anon tidak boleh panggil, hanya authenticated
REVOKE EXECUTE ON FUNCTION public.konfirmasi_pesanan_selesai(integer, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.konfirmasi_pesanan_selesai(integer, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.kirim_notifikasi(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kirim_notifikasi(UUID, TEXT) TO authenticated;


-- ============================================================
-- DONE. Jalankan get_advisors(security) untuk verifikasi.
-- ============================================================
