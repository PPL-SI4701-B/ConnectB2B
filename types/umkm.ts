export type Produk = {
  id: number;
  nama: string;
  harga?: number;
  gambar_url?: string;
  deskripsi?: string;
};

export type Equipment = {
  id: number;
  nama: string;
  harga_sewa?: number;
  gambar_url?: string;
  deskripsi?: string;
};

export type Ulasan = {
  id: number;
  rating: number;
  komentar: string | null;
  tanggal: string;
  industri_nama: string;
};

export type UmkmItem = {
  id: number | string;
  user_id: string;
  nama_usaha: string;
  alamat: string;
  kategori: string;
  kontak: string;
  nama_user: string;
  produk: Produk[];
  equipment: Equipment[];
  totalProduk: number;
  rating_avg: number;
  rating_count: number;
  ulasan: Ulasan[];
};
