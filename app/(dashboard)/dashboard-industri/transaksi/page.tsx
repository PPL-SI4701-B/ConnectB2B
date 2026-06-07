import { redirect } from 'next/navigation';

// Halaman transaksi Industri dikonsolidasikan ke satu sumber: /pantau-transaksi.
// Halaman tsb. menangani alur pembayaran escrow (berdasarkan keberadaan bukti/pembayaran,
// bukan default status_validasi) dan konfirmasi pesanan selesai (FR-16) dengan benar.
export default function TransaksiIndustriRedirect() {
  redirect('/pantau-transaksi');
}
