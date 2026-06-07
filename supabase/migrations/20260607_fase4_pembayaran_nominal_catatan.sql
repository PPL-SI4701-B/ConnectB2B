-- Fase 4: melengkapi FR-28 & FR-29
-- Diterapkan ke project via Supabase MCP (apply_migration) pada 2026-06-07.

-- FR-28: nominal transfer yang diinput Industri saat upload bukti pembayaran.
ALTER TABLE public.pembayaran
  ADD COLUMN IF NOT EXISTS jumlah_transfer numeric;

-- FR-29: catatan/alasan admin saat menolak bukti pembayaran.
ALTER TABLE public.pembayaran
  ADD COLUMN IF NOT EXISTS catatan_admin text;
