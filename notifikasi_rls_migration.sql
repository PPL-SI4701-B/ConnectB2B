-- Policy: User bisa melihat notifikasi mereka sendiri
DROP POLICY IF EXISTS "User can view their own notifikasi" ON public.notifikasi;
CREATE POLICY "User can view their own notifikasi" ON public.notifikasi
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Policy: User bisa mengupdate (status dibaca) notifikasi mereka sendiri
DROP POLICY IF EXISTS "User can update their own notifikasi" ON public.notifikasi;
CREATE POLICY "User can update their own notifikasi" ON public.notifikasi
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Policy: Authenticated user bisa mengirim (insert) notifikasi untuk user lain
DROP POLICY IF EXISTS "User can insert notifikasi" ON public.notifikasi;
CREATE POLICY "User can insert notifikasi" ON public.notifikasi
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Pastikan RLS aktif di tabel notifikasi
ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;
