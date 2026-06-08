-- Migration untuk menambahkan policy RLS pada laporan_konten agar user authenticated bisa melakukan insert laporan (auto-scanner) dan update/select laporan miliknya sendiri.
-- Dibuat: 2026-06-08

-- 1. Policy untuk INSERT: izinkan user authenticated membuat laporan_konten (untuk auto-moderasi)
DROP POLICY IF EXISTS "Authenticated users can insert laporan_konten" ON public.laporan_konten;
CREATE POLICY "Authenticated users can insert laporan_konten"
ON public.laporan_konten FOR INSERT TO authenticated
WITH CHECK (true);

-- 2. Policy untuk SELECT: izinkan user authenticated melihat laporan terkait produk/alat miliknya sendiri
DROP POLICY IF EXISTS "Authenticated users can select own laporan_konten" ON public.laporan_konten;
CREATE POLICY "Authenticated users can select own laporan_konten"
ON public.laporan_konten FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.produk p
    WHERE p.id = laporan_konten.katalog_id
      AND p.user_id = auth.uid()
      AND laporan_konten.katalog_type = 'produk'
  ) OR EXISTS (
    SELECT 1 FROM public.equipment e
    WHERE e.id = laporan_konten.katalog_id
      AND e.user_id = auth.uid()
      AND laporan_konten.katalog_type = 'equipment'
  )
);

-- 3. Policy untuk UPDATE: izinkan user authenticated mengupdate status laporan miliknya menjadi 'diabaikan' (resolve)
DROP POLICY IF EXISTS "Authenticated users can update own laporan_konten status" ON public.laporan_konten;
CREATE POLICY "Authenticated users can update own laporan_konten status"
ON public.laporan_konten FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.produk p
    WHERE p.id = laporan_konten.katalog_id
      AND p.user_id = auth.uid()
      AND laporan_konten.katalog_type = 'produk'
  ) OR EXISTS (
    SELECT 1 FROM public.equipment e
    WHERE e.id = laporan_konten.katalog_id
      AND e.user_id = auth.uid()
      AND laporan_konten.katalog_type = 'equipment'
  )
)
WITH CHECK (
  status = 'diabaikan'
);
