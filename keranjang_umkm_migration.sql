-- Run this in your Supabase SQL Editor to allow UMKM to use the Keranjang

-- 1. Add umkm_id column to keranjang table, referencing umkm
ALTER TABLE public.keranjang ADD COLUMN umkm_id bigint REFERENCES public.umkm(id);

-- 2. Make industri_id nullable because UMKM won't have an industri_id
ALTER TABLE public.keranjang ALTER COLUMN industri_id DROP NOT NULL;

-- 3. (Optional but recommended) Ensure that a cart item belongs to EITHER an Industri OR an UMKM, but not both or neither
ALTER TABLE public.keranjang ADD CONSTRAINT keranjang_owner_check CHECK (
  (industri_id IS NOT NULL AND umkm_id IS NULL) OR
  (industri_id IS NULL AND umkm_id IS NOT NULL)
);
