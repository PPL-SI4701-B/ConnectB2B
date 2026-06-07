/**
 * lib/validation.ts
 *
 * Kumpulan fungsi murni (pure functions) yang mengkodekan aturan bisnis ConnectB2B
 * sesuai dokumen "ConnectB2B_PBI_Descriptions_FR01-FR29.pdf".
 *
 * Fungsi-fungsi di sini sengaja dibuat tanpa dependensi React/Supabase agar mudah
 * diuji secara otomatis (unit test) untuk memenuhi kolom "Test Cases (Automated Testing)"
 * pada setiap FR. Logika yang sama dipakai/di-mirror dari komponen & server action nyata.
 */

// =====================================================================================
// Tipe bantuan
// =====================================================================================

/** Representasi file yang cukup untuk validasi (mirror dari browser File). */
export type FileLike = { type: string; size: number; name?: string };

export type ValidationResult = { valid: boolean; error?: string };

export type Role = 'umkm' | 'industri' | 'admin' | string;
export type StatusVerifikasi = 'terverifikasi' | 'menunggu' | 'ditolak' | string;

export const MB = 1024 * 1024;

// =====================================================================================
// FR-01 / FR-02 / FR-03 — Registrasi & kredensial
// =====================================================================================

/** Validasi format email sederhana. */
export function validateEmailFormat(email: string): ValidationResult {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
  return ok ? { valid: true } : { valid: false, error: 'Format email tidak valid' };
}

/** FR-01/02/03: kata sandi minimal 8 karakter. */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Kata sandi minimal 8 karakter.' };
  }
  return { valid: true };
}

/** FR-01: konfirmasi kata sandi harus sama. */
export function validatePasswordConfirmation(password: string, confirm: string): ValidationResult {
  if (password !== confirm) {
    return { valid: false, error: 'Konfirmasi kata sandi tidak cocok.' };
  }
  return { valid: true };
}

/**
 * FR-01 (5MB) / FR-02 (10MB): dokumen legalitas wajib PDF dan tidak melebihi batas.
 * @param maxMB batas ukuran dalam MB (UMKM = 5, Industri = 10)
 */
export function validateLegalDocument(file: FileLike, maxMB = 5): ValidationResult {
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Format file harus PDF.' };
  }
  if (file.size > maxMB * MB) {
    return { valid: false, error: `Ukuran file maks ${maxMB}MB.` };
  }
  return { valid: true };
}

/**
 * FR-01 TC-01-06 / FR-02 TC-02-02: tombol submit hanya aktif jika SEMUA dokumen yang
 * diwajibkan sudah terisi (UMKM: NIB+NPWP; Industri: SIUP+NIB+NPWP).
 */
export function allDocumentsUploaded(docs: Record<string, FileLike | null | undefined>): boolean {
  const values = Object.values(docs);
  if (values.length === 0) return false;
  return values.every((f) => !!f);
}

/** FR-02 TC-02-04: halaman pemilihan role menampilkan 2 pilihan. */
export function getRegisterRoleOptions(): string[] {
  return ['UMKM', 'Industri'];
}

/** FR-01/02 Step 1: validasi data akun lengkap (untuk tombol "Lanjutkan ke Upload Dokumen"). */
export function validateRegistrationStep1(data: {
  nama: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult {
  if (!data.nama?.trim() || !data.email?.trim() || !data.password || !data.confirmPassword) {
    return { valid: false, error: 'Lengkapi semua field.' };
  }
  const email = validateEmailFormat(data.email);
  if (!email.valid) return email;
  const pw = validatePassword(data.password);
  if (!pw.valid) return pw;
  const confirm = validatePasswordConfirmation(data.password, data.confirmPassword);
  if (!confirm.valid) return confirm;
  return { valid: true };
}

// =====================================================================================
// FR-03 / FR-04 — Login, redirect by role, proteksi route
// =====================================================================================

/** FR-03: tujuan redirect dashboard berdasarkan role. */
export function resolveRedirectPath(role: Role): string {
  switch ((role || '').toLowerCase()) {
    case 'umkm':
      return '/dashboard';
    case 'industri':
      return '/dashboard-industri';
    case 'admin':
      return '/admin';
    default:
      return '/login';
  }
}

export type LoginOutcome =
  | { type: 'redirect'; path: string }
  | { type: 'info'; status: StatusVerifikasi };

/**
 * FR-03: hasil setelah kredensial valid.
 * - terverifikasi → redirect ke dashboard sesuai role
 * - menunggu/ditolak → halaman info status verifikasi
 */
export function resolveLoginOutcome(user: { role: Role; status_verifikasi: StatusVerifikasi }): LoginOutcome {
  const status = (user.status_verifikasi || '').toLowerCase();
  // Admin tidak melalui proses verifikasi dokumen.
  if (status === 'terverifikasi' || (user.role || '').toLowerCase() === 'admin') {
    return { type: 'redirect', path: resolveRedirectPath(user.role) };
  }
  return { type: 'info', status };
}

/** FR-04 TC-04-02/03: akses route terproteksi tanpa session → harus redirect ke /login. */
export function canAccessProtectedRoute(session: unknown | null | undefined): boolean {
  return !!session;
}

// =====================================================================================
// FR-05 — Kelola profil (upload foto)
// =====================================================================================

/** FR-05 TC-05-03: foto profil harus berupa gambar dan tidak melebihi batas. */
export function validateImageUpload(file: FileLike, maxMB = 5): ValidationResult {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File harus berupa gambar.' };
  }
  if (file.size > maxMB * MB) {
    return { valid: false, error: `Ukuran file maks ${maxMB}MB.` };
  }
  return { valid: true };
}

// =====================================================================================
// FR-06 — Tambah produk
// =====================================================================================

/**
 * FR-06: validasi form produk.
 * - minimal 1 foto (TC-06-02)
 * - kategori wajib dipilih
 * - harga tidak boleh kosong / negatif
 */
export function validateProductForm(data: {
  nama: string;
  kategori: string;
  harga: number | null | undefined;
  fotoCount: number;
}): ValidationResult {
  if (!data.nama?.trim()) {
    return { valid: false, error: 'Nama item wajib diisi.' };
  }
  if (!data.fotoCount || data.fotoCount < 1) {
    return { valid: false, error: 'Minimal 1 foto.' };
  }
  if (!data.kategori?.trim()) {
    return { valid: false, error: 'Kategori wajib dipilih.' };
  }
  if (data.harga === null || data.harga === undefined || data.harga <= 0) {
    return { valid: false, error: 'Harga harus lebih dari 0.' };
  }
  return { valid: true };
}

// =====================================================================================
// FR-08 / FR-09 — Katalog publik: filter kategori & sorting
// =====================================================================================

export type KatalogItem = {
  id: number | string;
  nama: string;
  kategori?: string;
  harga?: number;
  created_at?: string;
  rating?: number;
};

/** FR-08 TC-08-03: filter produk berdasarkan kategori. */
export function filterByCategory<T extends { kategori?: string }>(items: T[], kategori?: string): T[] {
  if (!kategori || kategori.trim() === '' || kategori.toLowerCase() === 'semua') return items;
  const k = kategori.toLowerCase();
  return items.filter((i) => (i.kategori || '').toLowerCase() === k);
}

export type SortKey = 'terbaru' | 'termurah' | 'termahal' | 'rating';

/** FR-09: sorting katalog (terbaru, termurah, termahal, rating tertinggi). */
export function sortCatalog<T extends KatalogItem>(items: T[], sortKey: SortKey): T[] {
  const copy = [...items];
  switch (sortKey) {
    case 'termurah':
      return copy.sort((a, b) => (a.harga ?? 0) - (b.harga ?? 0));
    case 'termahal':
      return copy.sort((a, b) => (b.harga ?? 0) - (a.harga ?? 0));
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'terbaru':
    default:
      return copy.sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
  }
}

// =====================================================================================
// FR-07 — Lihat profil UMKM: hanya yang terverifikasi tampil
// =====================================================================================

/** FR-07 TC-07-03: UMKM yang belum terverifikasi tidak ditampilkan di daftar. */
export function filterVerifiedUmkm<T extends { status_verifikasi?: string }>(list: T[]): T[] {
  return list.filter((u) => (u.status_verifikasi || '').toLowerCase() === 'terverifikasi');
}

// =====================================================================================
// FR-11 — Keranjang kolaborasi (CRUD + checkout)
// =====================================================================================

export type CartItem = { id: number | string; nama?: string; qty: number };

/** FR-11 TC-11-02: tambah item ke keranjang (akumulasi qty jika sudah ada). */
export function addToCart(cart: CartItem[], item: CartItem): CartItem[] {
  const existing = cart.find((c) => c.id === item.id);
  if (existing) {
    return cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + item.qty } : c));
  }
  return [...cart, { ...item }];
}

/** FR-11 TC-11-03: ubah jumlah item di keranjang (min 1). */
export function updateCartQty(cart: CartItem[], id: number | string, qty: number): CartItem[] {
  const safeQty = Math.max(1, Math.floor(qty));
  return cart.map((c) => (c.id === id ? { ...c, qty: safeQty } : c));
}

/** FR-11 TC-11-04: hapus item dari keranjang. */
export function removeFromCart(cart: CartItem[], id: number | string): CartItem[] {
  return cart.filter((c) => c.id !== id);
}

/** FR-11: checkout dengan keranjang kosong harus ditolak. */
export function canCheckout(cart: CartItem[]): ValidationResult {
  if (!cart || cart.length === 0) {
    return { valid: false, error: 'Keranjang kosong.' };
  }
  return { valid: true };
}

// =====================================================================================
// FR-12 / FR-14 — Request kerja sama
// =====================================================================================

export type RequestRecord = {
  umkm_id?: number | null;
  industri_id?: number | null;
  sender_umkm_id?: number | null;
  produk_id?: number | null;
  equipment_id?: number | null;
  status?: string;
};

/** FR-12 TC-12-02: form request wajib mengisi detail/spesifikasi. */
export function validateRequestForm(data: { detail?: string }): ValidationResult {
  if (!data.detail?.trim()) {
    return { valid: false, error: 'Detail permintaan wajib diisi.' };
  }
  return { valid: true };
}

/**
 * FR-12: deteksi request duplikat — request 'pending' ke UMKM yang sama untuk item yang sama
 * dari pengirim yang sama dianggap duplikat.
 */
export function isDuplicateRequest(existing: RequestRecord[], next: RequestRecord): boolean {
  return existing.some((r) => {
    if ((r.status || '').toLowerCase() !== 'pending') return false;
    if (r.umkm_id !== next.umkm_id) return false;
    const sameSender =
      (next.industri_id != null && r.industri_id === next.industri_id) ||
      (next.sender_umkm_id != null && r.sender_umkm_id === next.sender_umkm_id);
    if (!sameSender) return false;
    if (next.produk_id != null) return r.produk_id === next.produk_id;
    if (next.equipment_id != null) return r.equipment_id === next.equipment_id;
    return true;
  });
}

/** FR-14 TC-14-01/02: keputusan terima/tolak request memetakan ke status final. */
export function applyRequestDecision(decision: 'terima' | 'tolak'): string {
  return decision === 'terima' ? 'approve' : 'ditolak';
}

// =====================================================================================
// FR-13 — Notifikasi
// =====================================================================================

export type Notifikasi = { id: number | string; status: string };

/** FR-13 TC-13-01: jumlah notifikasi belum dibaca (badge). */
export function countUnread(notifs: Notifikasi[]): number {
  return notifs.filter((n) => (n.status || '').toLowerCase() !== 'dibaca').length;
}

/** FR-13 TC-13-03: tandai notifikasi sudah dibaca. */
export function markAsRead(notif: Notifikasi): Notifikasi {
  return { ...notif, status: 'dibaca' };
}

// =====================================================================================
// FR-15 / FR-16 — Update progres & konfirmasi selesai (kontrol akses peran)
// =====================================================================================

/** FR-15: hanya UMKM yang boleh memperbarui status progres kerja sama. */
export function canUpdateProgress(role: Role): boolean {
  return (role || '').toLowerCase() === 'umkm';
}

/** FR-16: hanya Industri (pembeli) yang mengonfirmasi pesanan selesai. */
export function canConfirmCompletion(role: Role): boolean {
  return (role || '').toLowerCase() === 'industri';
}

// =====================================================================================
// FR-17 / FR-18 — Rating & review
// =====================================================================================

/**
 * FR-17: validasi ulasan.
 * - rating wajib 1-5 (TC-17-03: tanpa bintang → error)
 * - komentar opsional (TC-17-02)
 */
export function validateReview(data: { rating: number; komentar?: string }): ValidationResult {
  if (!data.rating || data.rating < 1 || data.rating > 5) {
    return { valid: false, error: 'Rating bintang wajib diisi (1-5).' };
  }
  return { valid: true };
}

/** FR-17: ulasan hanya bisa diedit dalam jendela 24 jam. */
export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canEditReview(createdAt: string | number | Date, now: number = Date.now()): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= REVIEW_EDIT_WINDOW_MS;
}

/** FR-18 TC-18-01/02: hitung rata-rata rating + jumlah ulasan. */
export function computeAverageRating(ulasan: { rating: number }[]): { avg: number; count: number } {
  if (!ulasan || ulasan.length === 0) return { avg: 0, count: 0 };
  const total = ulasan.reduce((sum, u) => sum + (u.rating || 0), 0);
  return { avg: total / ulasan.length, count: ulasan.length };
}

// =====================================================================================
// FR-20 / FR-21 / FR-22 — Akses admin, manajemen akun, moderasi konten
// =====================================================================================

/** FR-20: hanya admin yang boleh mengakses dashboard admin. */
export function canAccessAdmin(role: Role): boolean {
  return (role || '').toLowerCase() === 'admin';
}

/** FR-21 TC-21-01/02: toggle blokir/aktif akun. */
export function toggleBlockStatus(currentStatus: 'aktif' | 'diblokir' | string): 'aktif' | 'diblokir' {
  return (currentStatus || '').toLowerCase() === 'diblokir' ? 'aktif' : 'diblokir';
}

/** FR-22 TC-22-01/02: keputusan moderasi konten. */
export function applyContentModeration(decision: 'hapus' | 'abaikan'): {
  removed: boolean;
  notifyOwner: boolean;
} {
  return decision === 'hapus'
    ? { removed: true, notifyOwner: true }
    : { removed: false, notifyOwner: false };
}

// =====================================================================================
// FR-24 / FR-26 / FR-27 — Verifikasi dokumen & status badge
// =====================================================================================

/** FR-27: warna badge status verifikasi. */
export function getStatusBadge(status: StatusVerifikasi): { color: 'hijau' | 'kuning' | 'merah'; label: string } {
  switch ((status || '').toLowerCase()) {
    case 'terverifikasi':
      return { color: 'hijau', label: 'Terverifikasi' };
    case 'ditolak':
      return { color: 'merah', label: 'Ditolak' };
    case 'menunggu':
    default:
      return { color: 'kuning', label: 'Menunggu' };
  }
}

/**
 * FR-24 TC-24-03: akun UMKM menjadi 'terverifikasi' hanya jika SEMUA dokumen terverifikasi.
 * Jika ada satu yang ditolak → 'ditolak'; selain itu → 'menunggu'.
 */
export function resolveAccountVerificationStatus(docStatuses: StatusVerifikasi[]): StatusVerifikasi {
  if (docStatuses.length === 0) return 'menunggu';
  const lower = docStatuses.map((s) => (s || '').toLowerCase());
  if (lower.some((s) => s === 'ditolak')) return 'ditolak';
  if (lower.every((s) => s === 'terverifikasi')) return 'terverifikasi';
  return 'menunggu';
}

/** FR-26 TC-26-02: dokumen Industri lengkap = tepat 3 dokumen (SIUP, NIB, NPWP) terupload. */
export function isDokumenIndustriLengkap(uploadedCount: number): boolean {
  return uploadedCount >= 3;
}

// =====================================================================================
// FR-28 / FR-29 — Pembayaran (upload bukti & validasi admin)
// =====================================================================================

/**
 * FR-28: validasi upload bukti pembayaran.
 * - file harus gambar (TC-28-03: PDF ditolak)
 * - nominal transfer wajib > 0 (TC-28-02: tanpa nominal → error)
 */
export function validatePaymentProof(data: { file: FileLike; nominal: number | null | undefined; maxMB?: number }): ValidationResult {
  if (!data.file || !data.file.type.startsWith('image/')) {
    return { valid: false, error: 'Bukti pembayaran harus berupa gambar.' };
  }
  const maxMB = data.maxMB ?? 5;
  if (data.file.size > maxMB * MB) {
    return { valid: false, error: `Ukuran file maks ${maxMB}MB.` };
  }
  if (data.nominal === null || data.nominal === undefined || !(data.nominal > 0)) {
    return { valid: false, error: 'Nominal transfer wajib diisi.' };
  }
  return { valid: true };
}

export type PaymentValidationOutcome =
  | { transaksiStatus: 'lunas'; pembayaranStatus: 'berhasil' }
  | { pembayaranStatus: 'gagal'; error?: string };

/**
 * FR-29: validasi pembayaran oleh admin.
 * - valid → transaksi 'lunas', proyek aktif (TC-29-01)
 * - tolak → wajib alasan, pembayaran 'gagal' (TC-29-02)
 */
export function applyPaymentValidation(
  decision: 'valid' | 'tolak',
  opts: { alasan?: string } = {}
): PaymentValidationOutcome {
  if (decision === 'valid') {
    return { transaksiStatus: 'lunas', pembayaranStatus: 'berhasil' };
  }
  if (!opts.alasan?.trim()) {
    return { pembayaranStatus: 'gagal', error: 'Alasan penolakan wajib diisi.' };
  }
  return { pembayaranStatus: 'gagal' };
}
