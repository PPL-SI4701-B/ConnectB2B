-- Fase 2: perbaikan data fidelity + hardening
-- Diterapkan ke project via Supabase MCP (apply_migration) pada 2026-06-07.

-- B1: simpan kuantitas pada request agar tidak hilang dari keranjang → transaksi.
-- Sebelumnya kuantitas hanya tersimpan di teks `pesan`, dan detail_transaksi
-- selalu memakai kuantitas = 1 sehingga nominal tagihan tidak akurat.
ALTER TABLE public.request
  ADD COLUMN IF NOT EXISTS kuantitas integer NOT NULL DEFAULT 1;

ALTER TABLE public.request
  ADD CONSTRAINT request_kuantitas_positive CHECK (kuantitas >= 1);

-- B7: fungsi konfirmasi pesanan selesai tidak boleh bisa dipanggil tanpa login (anon).
-- Tetap dapat dipanggil oleh authenticated (alur Industri mengonfirmasi pesanan).
REVOKE EXECUTE ON FUNCTION public.konfirmasi_pesanan_selesai(integer) FROM anon;
