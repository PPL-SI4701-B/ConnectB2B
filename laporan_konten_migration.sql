-- Migration untuk membuat tabel laporan_konten

-- Buat ENUM untuk status dan severity jika diperlukan, atau pakai text biasa.
-- Untuk kesederhanaan, kita bisa pakai CHECK constraint pada text, atau buat tipe enum baru.
CREATE TYPE laporan_status AS ENUM ('pending', 'dihapus', 'diabaikan');
CREATE TYPE laporan_severity AS ENUM ('berat', 'ringan');
CREATE TYPE katalog_type AS ENUM ('produk', 'equipment');

CREATE TABLE IF NOT EXISTS public.laporan_konten (
    id SERIAL PRIMARY KEY,
    katalog_type katalog_type NOT NULL DEFAULT 'produk',
    katalog_id INT NOT NULL,
    pelapor TEXT NOT NULL,
    alasan TEXT NOT NULL,
    severity laporan_severity NOT NULL DEFAULT 'ringan',
    status laporan_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.laporan_konten ENABLE ROW LEVEL SECURITY;

-- Policy untuk Admin agar bisa read, insert, update
CREATE POLICY "Admin dapat melihat seluruh laporan_konten"
ON public.laporan_konten FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admin dapat mengelola laporan_konten"
ON public.laporan_konten FOR ALL
USING (public.is_admin());

-- Policy untuk sistem agar bisa insert laporan dari scanner (anon atau service role bypasses rls)
-- (Atau biarkan default service role insert data)

-- Tambahkan mock data untuk UI
-- Kita perlu beberapa ID produk yang valid, jadi kita pakai subquery.
DO $$
DECLARE
    prod1_id INT;
    prod2_id INT;
BEGIN
    SELECT id INTO prod1_id FROM public.produk ORDER BY id ASC LIMIT 1;
    SELECT id INTO prod2_id FROM public.produk ORDER BY id ASC OFFSET 1 LIMIT 1;

    IF prod1_id IS NOT NULL THEN
        INSERT INTO public.laporan_konten (katalog_type, katalog_id, pelapor, alasan, severity, status)
        VALUES ('produk', prod1_id, 'PT Industri Retail Sentosa (Terkait Hak Cipta)', 'Barang diduga palsu atau melanggar hak cipta.', 'berat', 'pending');
    END IF;

    IF prod2_id IS NOT NULL THEN
        INSERT INTO public.laporan_konten (katalog_type, katalog_id, pelapor, alasan, severity, status)
        VALUES ('produk', prod2_id, 'AI Bot Scanner Platform', 'Indikasi Spam Teks dan SEO yang berlebihan.', 'ringan', 'pending');
    END IF;
END $$;
