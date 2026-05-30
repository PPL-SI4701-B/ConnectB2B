import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import PantauTransaksiClient from './PantauTransaksiClient';

export const metadata = {
  title: 'Pembelian & Kerja Sama | ConnectB2B Industri',
  description: 'Pantau status transaksi, lakukan pembayaran escrow, dan konfirmasi pesanan selesai sebagai Industri.',
};

export default async function PantauTransaksiPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get industri data
  const { data: industri } = await supabase
    .from('industri')
    .select('id, nama_perusahaan')
    .eq('user_id', user.id)
    .single();

  if (!industri) {
    redirect('/dashboard');
  }

  // Fetch all transaksi for this industri
  const { data: transaksiRaw, error } = await supabase
    .from('transaksi')
    .select(`
      id,
      request_id,
      status,
      status_validasi,
      tanggal_mulai,
      tanggal_selesai,
      progress_status,
      request:request_id (
        id,
        industri_id,
        pesan,
        status,
        umkm_id,
        produk:produk_id (
          nama,
          harga
        ),
        equipment:equipment_id (
          nama,
          harga_sewa
        )
      ),
      detail_transaksi (
        id,
        kuantitas,
        harga_satuan,
        subtotal,
        produk:produk_id (
          nama
        ),
        equipment:equipment_id (
          nama
        )
      ),
      pembayaran (
        id,
        bukti_transfer,
        status,
        tanggal_bayar
      ),
      transaksi_history (
        id,
        status_progress,
        pesan,
        created_at
      )
    `)
    .order('tanggal_mulai', { ascending: false });

  if (error) {
    console.error('Error fetching transaksi:', error);
  }

  // Filter transaksi that belong to this Industri
  const transaksiFiltered = (transaksiRaw || []).filter((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    return req?.industri_id === industri.id;
  });

  // Fetch UMKM details for the target partners
  const umkmIds = Array.from(
    new Set(
      transaksiFiltered.map((t: any) => {
        const req = Array.isArray(t.request) ? t.request[0] : t.request;
        return req?.umkm_id;
      }).filter(Boolean)
    )
  ) as number[];

  let umkmMap: Record<number, { nama: string; userId: string }> = {};
  if (umkmIds.length > 0) {
    const { data: umkms } = await supabase
      .from('umkm')
      .select('id, nama_usaha, user_id')
      .in('id', umkmIds);

    (umkms || []).forEach((u: any) => {
      umkmMap[u.id] = {
        nama: u.nama_usaha,
        userId: u.user_id
      };
    });
  }

  // Fetch reviews to see if ulasan already exists
  const transaksiIds = transaksiFiltered.map((t: any) => t.id);
  let ulasanSet = new Set<number>();
  if (transaksiIds.length > 0) {
    const { data: ulasanData } = await supabase
      .from('ulasan')
      .select('transaksi_id')
      .in('transaksi_id', transaksiIds);
    ulasanData?.forEach((u: any) => ulasanSet.add(u.transaksi_id));
  }

  // Fetch all products and equipment from the database to map cart items
  const { data: allProduk } = await supabase.from('produk').select('id, nama, harga');
  const { data: allEquipment } = await supabase.from('equipment').select('id, nama, harga_sewa');

  const prodList = allProduk || [];
  const equipList = allEquipment || [];

  // Format for client
  const formattedTransaksi = transaksiFiltered.map((t: any) => {
    const req = Array.isArray(t.request) ? t.request[0] : t.request;
    const partnerInfo = umkmMap[req?.umkm_id] || { nama: 'Mitra UMKM Tidak Diketahui', userId: '' };

    // Calculate total bill from detail_transaksi
    const detailsRaw = t.detail_transaksi || [];
    let details = detailsRaw.map((d: any) => ({
      id: d.id,
      kuantitas: d.kuantitas,
      hargaSatuan: d.harga_satuan,
      subtotal: d.subtotal,
      itemName: d.produk?.nama || d.equipment?.nama || 'Item Tidak Diketahui'
    }));

    let totalTagihan = details.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);

    // Fallback if detail_transaksi is empty but product or equipment exists on request or is in the pesan field
    if (details.length === 0 && req) {
      // 1. Try to parse from the pesan text (Collaboration Cart)
      const parsedItems: any[] = [];
      const lines = (req.pesan || '').split('\n');
      let idCounter = -100;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('-')) continue;
        
        // Match "- Name (Type) xQty" or "- Name xQty"
        const match = trimmed.match(/^-\s*(.+?)(?:\s*\((Produk|Alat|Mesin)\))?\s*x\s*(\d+)$/i);
        if (match) {
          const name = match[1].trim();
          const type = match[2] ? match[2].toLowerCase() : '';
          const qty = parseInt(match[3]) || 1;
          
          let price = 0;
          let dbItem = null;
          
          if (type === 'produk' || !type) {
            dbItem = prodList.find((p: any) => p.nama.trim().toLowerCase() === name.toLowerCase());
          }
          if (!dbItem && (type === 'alat' || type === 'mesin' || !type)) {
            dbItem = equipList.find((e: any) => e.nama.trim().toLowerCase() === name.toLowerCase());
          }
          
          if (dbItem) {
            price = (dbItem as any).harga || (dbItem as any).harga_sewa || 0;
          }
          
          parsedItems.push({
            id: idCounter--,
            kuantitas: qty,
            hargaSatuan: price,
            subtotal: price * qty,
            itemName: dbItem ? dbItem.nama : name
          });
        }
      }
      
      if (parsedItems.length > 0) {
        details = parsedItems;
        totalTagihan = details.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
      } else if (req.produk) {
        const price = req.produk.harga || 0;
        totalTagihan = price;
        details = [{
          id: -1,
          kuantitas: 1,
          hargaSatuan: price,
          subtotal: price,
          itemName: req.produk.nama
        }];
      } else if (req.equipment) {
        const price = req.equipment.harga_sewa || 0;
        totalTagihan = price;
        details = [{
          id: -2,
          kuantitas: 1,
          hargaSatuan: price,
          subtotal: price,
          itemName: req.equipment.nama
        }];
      }
    }

    // Get current payment status/url if exists
    const payment = Array.isArray(t.pembayaran) ? t.pembayaran[0] : t.pembayaran;

    return {
      id: t.id,
      trxCode: `TRX-${t.id.toString().padStart(4, '0')}`,
      status: t.status,
      statusValidasi: t.status_validasi,
      progressStatus: t.progress_status || 'Menunggu Material',
      history: (t.transaksi_history || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      tanggalMulai: t.tanggal_mulai,
      tanggalSelesai: t.tanggal_selesai,
      pesan: req?.pesan || '-',
      mitraNama: partnerInfo.nama,
      mitraUserId: partnerInfo.userId,
      totalTagihan,
      details,
      buktiTransfer: payment?.bukti_transfer || null,
      pembayaranStatus: payment?.status || null,
      hasUlasan: ulasanSet.has(t.id)
    };
  });

  return (
    <div className="w-full bg-[#f4f7fe] min-h-screen">
      <div className="p-8">
        <PantauTransaksiClient transaksi={formattedTransaksi} industriName={industri.nama_perusahaan} />
      </div>
    </div>
  );
}
