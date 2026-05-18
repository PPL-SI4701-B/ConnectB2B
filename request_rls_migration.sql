-- Run this in your Supabase SQL Editor to allow authenticated users to insert into the request table

-- Enable RLS just in case it's not enabled
ALTER TABLE public.request ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa melihat request mereka sendiri (sebagai pengirim atau penerima)
-- Note: Replace or ignore if you already have a SELECT policy
DROP POLICY IF EXISTS "User can view related requests" ON public.request;
CREATE POLICY "User can view related requests" ON public.request
  FOR SELECT TO authenticated
  USING (true); -- Allow all authenticated users to read requests for now, or tighten it based on umkm_id/industri_id

-- Policy: User bisa mengirim (insert) request
DROP POLICY IF EXISTS "User can insert request" ON public.request;
CREATE POLICY "User can insert request" ON public.request
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Policy: User bisa mengupdate (status approve/ditolak) request
DROP POLICY IF EXISTS "User can update request" ON public.request;
CREATE POLICY "User can update request" ON public.request
  FOR UPDATE TO authenticated
  USING (true);
