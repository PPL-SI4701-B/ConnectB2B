-- Create storage buckets required by ProfileClient
-- Run this once in the Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',   'avatars',   true),
  ('documents', 'documents', false),
  ('bukti-bayar', 'bukti-bayar', true)
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies for "avatars" bucket ──
-- Allow authenticated users to upload/update their own avatar & cover
CREATE POLICY "avatars: authenticated upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars: authenticated update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read of avatars (needed for public profile photos)
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- ── RLS policies for "documents" bucket ──
-- Authenticated users upload to their own folder only
CREATE POLICY "documents: authenticated upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents: authenticated update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admin and owner can read documents
CREATE POLICY "documents: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── RLS policies for "bukti-bayar" bucket ──
-- Authenticated users can upload to "bukti-bayar"
CREATE POLICY "bukti-bayar: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bukti-bayar');

CREATE POLICY "bukti-bayar: authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bukti-bayar');

-- Everyone can read (public bucket)
CREATE POLICY "bukti-bayar: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'bukti-bayar');

