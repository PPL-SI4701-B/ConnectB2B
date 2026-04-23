-- =========================================================================================
-- MIGRATION: UPDATE REGISTRATION TO MULTI-STEP VERIFICATION
-- NON-DESTRUCTIVE & IDEMPOTENT
-- =========================================================================================

-- 1. ALTER TABLE users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status_verifikasi') THEN
        -- Reusing the existing 'verifikasi_status' enum which was added in previous migration
        ALTER TABLE public.users ADD COLUMN status_verifikasi public.verifikasi_status DEFAULT 'menunggu' NOT NULL;
        ALTER TABLE public.users ADD COLUMN verified_at timestamptz;
        ALTER TABLE public.users ADD COLUMN verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
        
        -- Backward compatibility: approve existing users so they aren't blocked
        UPDATE public.users SET status_verifikasi = 'terverifikasi', verified_at = NOW();
    END IF;
END $$;


-- 2. ALTER TABLE dokumen_legalitas
-- Delete exact duplicates first based on newer created_at
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY user_id, jenis_dokumen ORDER BY created_at DESC) as row_num
    FROM public.dokumen_legalitas
)
DELETE FROM public.dokumen_legalitas WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- Apply constraints
DO $$
BEGIN
    -- Check Constraint for types of documents
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_jenis_dokumen') THEN
        ALTER TABLE public.dokumen_legalitas ADD CONSTRAINT check_jenis_dokumen 
        CHECK (jenis_dokumen IN ('NIB', 'NPWP', 'SIUP', 'IUT', 'Lainnya'));
    END IF;
    
    -- Unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_jenis_dokumen') THEN
        ALTER TABLE public.dokumen_legalitas ADD CONSTRAINT unique_user_jenis_dokumen UNIQUE (user_id, jenis_dokumen);
    END IF;
END $$;

-- Explicit index (though UNIQUE creates one, this explicitly covers it for queries)
CREATE INDEX IF NOT EXISTS idx_dokumen_user_jenis ON public.dokumen_legalitas(user_id, jenis_dokumen);


-- 3. SUPABASE STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dokumen', 'dokumen', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop existing policies if any to recreate
DROP POLICY IF EXISTS "dokumen_insert_path" ON storage.objects;
DROP POLICY IF EXISTS "dokumen_read_own" ON storage.objects;
DROP POLICY IF EXISTS "dokumen_delete_admin" ON storage.objects;

-- RLS: Insert to specific path using the role helper
CREATE POLICY "dokumen_insert_path" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'dokumen' 
    AND (storage.foldername(name))[1] = public.get_user_role()::text
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- RLS: Read own or admin reads all
CREATE POLICY "dokumen_read_own" ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'dokumen' 
    AND (
        (storage.foldername(name))[2] = auth.uid()::text OR public.is_admin()
    )
);

-- RLS: Only Admin can delete
CREATE POLICY "dokumen_delete_admin" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dokumen' AND public.is_admin());


-- 4. UPDATE RLS ON dokumen_legalitas
-- Drop existing policies to refresh them
DROP POLICY IF EXISTS "dokumen_select_own" ON public.dokumen_legalitas;
DROP POLICY IF EXISTS "dokumen_insert_own" ON public.dokumen_legalitas;
DROP POLICY IF EXISTS "dokumen_update_admin" ON public.dokumen_legalitas;
DROP POLICY IF EXISTS "dokumen_delete_own" ON public.dokumen_legalitas;
DROP POLICY IF EXISTS "dok_select" ON public.dokumen_legalitas;
DROP POLICY IF EXISTS "dok_insert" ON public.dokumen_legalitas;
DROP POLICY IF EXISTS "dok_update" ON public.dokumen_legalitas;
DROP POLICY IF EXISTS "dok_delete" ON public.dokumen_legalitas;

-- Standard table RLS
CREATE POLICY "dok_select" ON public.dokumen_legalitas FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "dok_insert" ON public.dokumen_legalitas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "dok_update" ON public.dokumen_legalitas FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "dok_delete" ON public.dokumen_legalitas FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Column security trigger (Prevents user from updating verification status)
CREATE OR REPLACE FUNCTION public.check_dokumen_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If normal user is updating
    IF auth.uid() = OLD.user_id AND NOT public.is_admin() THEN
        -- Prevent arbitrary status changes
        NEW.status_verifikasi = OLD.status_verifikasi;
        NEW.catatan_admin = OLD.catatan_admin;
        NEW.user_id = OLD.user_id; -- prevent switching ownership
        
        -- Automatically reset to 'menunggu' if file changes
        IF NEW.file_url IS DISTINCT FROM OLD.file_url THEN
            NEW.status_verifikasi = 'menunggu';
            NEW.catatan_admin = NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_check_dokumen_update ON public.dokumen_legalitas;
CREATE TRIGGER trg_check_dokumen_update
BEFORE UPDATE ON public.dokumen_legalitas
FOR EACH ROW EXECUTE FUNCTION public.check_dokumen_update();


-- 5. VIEW pending_verifications
CREATE OR REPLACE VIEW public.pending_verifications AS
SELECT 
    u.id AS user_id, 
    u.email,
    u.role,
    COALESCE(um.nama_usaha, ind.nama_perusahaan, u.nama) AS nama_entitas,
    u.status_verifikasi AS user_status,
    json_agg(
        json_build_object(
            'id', d.id,
            'jenis_dokumen', d.jenis_dokumen,
            'file_url', d.file_url,
            'status', d.status_verifikasi,
            'catatan', d.catatan_admin
        )
    ) AS dokumen_list
FROM public.users u
LEFT JOIN public.umkm um ON u.id = um.user_id
LEFT JOIN public.industri ind ON u.id = ind.user_id
LEFT JOIN public.dokumen_legalitas d ON u.id = d.user_id
WHERE u.status_verifikasi = 'menunggu'
GROUP BY u.id, u.email, u.role, um.nama_usaha, ind.nama_perusahaan, u.status_verifikasi;


-- 6. DB FUNCTION & TRIGGER for User Verif Status Sync
CREATE OR REPLACE FUNCTION public.sync_user_verification_status()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_has_ditolak boolean;
    v_has_menunggu_or_missing boolean;
    v_doc_count integer;
BEGIN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    
    -- Evaluate the documents for this user
    SELECT 
        BOOL_OR(status_verifikasi = 'ditolak'),
        BOOL_OR(status_verifikasi = 'menunggu'),
        COUNT(*)
    INTO v_has_ditolak, v_has_menunggu_or_missing, v_doc_count
    FROM public.dokumen_legalitas
    WHERE user_id = v_user_id;
    
    -- Determine and update overall user status
    IF v_has_ditolak THEN
        UPDATE public.users SET status_verifikasi = 'ditolak' 
        WHERE id = v_user_id AND status_verifikasi != 'ditolak';
    ELSIF NOT COALESCE(v_has_menunggu_or_missing, true) AND v_doc_count > 0 THEN
        -- All docs are verified
        UPDATE public.users SET 
            status_verifikasi = 'terverifikasi',
            verified_at = NOW(),
            verified_by = CASE WHEN public.is_admin() THEN auth.uid() ELSE verified_by END
        WHERE id = v_user_id AND status_verifikasi != 'terverifikasi';
    ELSE
        -- Still waiting or no docs
        UPDATE public.users SET status_verifikasi = 'menunggu' 
        WHERE id = v_user_id AND status_verifikasi != 'menunggu';
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_sync_user_verification ON public.dokumen_legalitas;
CREATE TRIGGER trg_sync_user_verification
AFTER INSERT OR UPDATE OR DELETE ON public.dokumen_legalitas
FOR EACH ROW EXECUTE FUNCTION public.sync_user_verification_status();


/*
-- ===========================================
-- ROLLBACK SCRIPT 
-- (Block Select, run selectively if needed)
-- ===========================================
DROP TRIGGER IF EXISTS trg_sync_user_verification ON public.dokumen_legalitas;
DROP FUNCTION IF EXISTS public.sync_user_verification_status();
DROP TRIGGER IF EXISTS trg_check_dokumen_update ON public.dokumen_legalitas;
DROP FUNCTION IF EXISTS public.check_dokumen_update();
DROP VIEW IF EXISTS public.pending_verifications;

ALTER TABLE public.users DROP COLUMN IF EXISTS status_verifikasi;
ALTER TABLE public.users DROP COLUMN IF EXISTS verified_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS verified_by;

ALTER TABLE public.dokumen_legalitas DROP CONSTRAINT IF EXISTS unique_user_jenis_dokumen;
ALTER TABLE public.dokumen_legalitas DROP CONSTRAINT IF EXISTS check_jenis_dokumen;
*/
