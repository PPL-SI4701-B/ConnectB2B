-- 1. ADD SENDER UMKM ID TO REQUEST TABLE
-- This is needed so that when an UMKM sends a request to another UMKM,
-- we know who the sender is (since industri_id would be null).
ALTER TABLE public.request ADD COLUMN sender_umkm_id bigint REFERENCES public.umkm(id);

-- 2. RLS POLICIES FOR REQUEST TABLE
ALTER TABLE public.request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can insert request" ON public.request;
CREATE POLICY "User can insert request" ON public.request
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "User can update request" ON public.request;
CREATE POLICY "User can update request" ON public.request
  FOR UPDATE TO authenticated
  USING (true);

-- 3. RLS POLICIES FOR TRANSAKSI TABLE
-- Without this, accepting a request will fail with 42501 when trying to insert into transaksi
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view related transaksi" ON public.transaksi;
CREATE POLICY "User can view related transaksi" ON public.transaksi
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "User can insert transaksi" ON public.transaksi;
CREATE POLICY "User can insert transaksi" ON public.transaksi
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "User can update transaksi" ON public.transaksi;
CREATE POLICY "User can update transaksi" ON public.transaksi
  FOR UPDATE TO authenticated
  USING (true);
