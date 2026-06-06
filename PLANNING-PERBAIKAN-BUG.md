# Planning Perbaikan Bug — ConnectB2B

> Dibuat: 2026-06-06 · Diperbarui: 2026-06-06 (v2 — audit ulang lengkap)
> Basis: Laporan Audit awal (26 temuan) + Audit Supabase Live (20 lint) + Code Review Lanjutan (11 temuan baru)
> Branch kerja: `fix/audit-remediation`
> Status legenda: ☐ belum · ◐ proses · ☑ selesai

## Ringkasan Hasil Audit Supabase Live (`get_advisors`)

| Level | Count | Detail |
|-------|-------|--------|
| **ERROR** | 1 | `security_definer_view` → `pending_verifications` |
| **WARN** | 19 | 3× `rls_policy_always_true`, 2× `public_bucket_allows_listing`, 6× `anon_security_definer_function_executable`, 6× `authenticated_security_definer_function_executable`, 1× `auth_leaked_password_protection` |

### RLS Policy `true` yang masih aktif (konfirmasi live):
| Tabel | Policy Name | Command |
|-------|-------------|---------|
| `request` | `User can insert request` | INSERT |
| `request` | `User can update request` | UPDATE |
| `request` | `User can view related requests` | SELECT |
| `transaksi` | `User can insert transaksi` | INSERT |
| `transaksi` | `User can view related transaksi` | SELECT |
| `notifikasi` | `notifikasi_insert_authenticated` | INSERT |

> **Catatan:** Policy ketat (`request_insert_industri`, `request_select_involved`, `request_update_involved`, `transaksi_select_involved`, `transaksi_update_industri`) **sudah ada** tapi **tertimpa** oleh policy `true` yang juga masih aktif. Ini berarti policy ketat efektif tidak berfungsi karena ada policy PERMISSIVE `true` yang berlaku paralel.

### SECURITY DEFINER Functions yang bisa dieksekusi anon & authenticated:
- `check_dokumen_update()` — trigger, tidak boleh callable via REST
- `get_user_role()` — helper, tidak boleh callable via REST oleh anon
- `handle_new_user()` — trigger, tidak boleh callable via REST
- `is_admin()` — helper, dipakai di RLS, tapi harus di-revoke dari anon
- `konfirmasi_pesanan_selesai(...)` — RPC, harus revoke anon
- `sync_user_verification_status()` — trigger, tidak boleh callable via REST

### Kolom Database yang hilang (konfirmasi live):
- **`keranjang.created_at`** — **TIDAK ADA** → `.order('created_at')` di `page.tsx:45` akan ERROR

---

## Temuan Baru dari Code Review (#27–#37)

| # | Severity | Temuan | File/Lokasi |
|---|----------|--------|-------------|
| **#27** | 🔴 KRITIS | **Kredensial hardcoded di repo** — `create_admin.mjs` berisi Supabase URL, anon key, email admin (`admin@connectb2b.com`), dan password (`adminpassword123`) dalam plaintext. File ini **TIDAK** ada di `.gitignore`. | `create_admin.mjs` |
| **#28** | 🔴 KRITIS | **`updateCartQuantity` & `removeFromCart` tidak verifikasi kepemilikan** — Siapa pun bisa update/delete item keranjang orang lain jika tahu `cartId`. Tidak ada pengecekan bahwa `cartId` milik user yang login. | `cart-actions.ts:86-118` |
| **#29** | 🟠 SEDANG | **`KeranjangClient` (UMKM) melakukan operasi DB langsung dari client** — Insert request, insert notifikasi, dan delete keranjang dilakukan via Supabase client-side, bukan server action. Ini bypass validasi server dan membuka celah manipulasi. | `KeranjangClient.tsx:69-91` |
| **#30** | 🟠 SEDANG | **`updateTransaksiProgress` tidak verifikasi kepemilikan transaksi** — Fungsi hanya cek user login, tapi tidak cek bahwa `transaksiId` benar-benar milik UMKM pemanggil. + Tidak ada RLS UPDATE policy untuk UMKM pada tabel `transaksi` (hanya `transaksi_update_industri`). | `transaksi-actions.ts:20-24` |
| **#31** | 🟠 SEDANG | **`ProfileClient` upload dokumen ke bucket `documents` (bukan `dokumen`)** — Profil menggunakan bucket `documents` dan menyimpan `getPublicUrl` (full URL) ke `file_url`. Registrasi menggunakan bucket `dokumen` dan menyimpan relative path. Inkonsistensi ini menyebabkan admin tidak bisa membuka dokumen dari dua sumber yang berbeda. | `ProfileClient.tsx:112-119` |
| **#32** | 🟠 SEDANG | **`verifyPayment`/`rejectPayment` menerima `industriUserId` & `umkmUserId` dari client** — Parameter sensitif dikirim dari frontend. Seharusnya di-derive dari data transaksi di server. Attacker bisa mengirim notifikasi ke user lain. | `admin-actions.ts:157, 229` |
| **#33** | 🟠 SEDANG | **`konfirmasiSelesai` RPC menerima `umkmUserId` & `industriNama` dari client** — Sama seperti #32, parameter trust-the-client. Seharusnya RPC sendiri derive dari `auth.uid()` dan relasi transaksi. | `pantau-transaksi/actions.ts:36-39` |
| **#34** | 🟡 RENDAH | **`checkoutCart` tidak menyertakan `produk_id`/`equipment_id` pada request** — Saat checkout, request hanya berisi `pesan` tanpa info item yang dibeli. UMKM tidak bisa tahu produk mana yang diminta. | `cart-actions.ts:136-143` |
| **#35** | 🟡 RENDAH | **`acceptRequest` tidak membuat `detail_transaksi`** — Saat transaksi dibuat, tabel `detail_transaksi` kosong (0 rows di DB live, padahal ada 7 transaksi). Akibatnya total nilai selalu "Rp -" di semua halaman. | `request-actions.ts:40-48` |
| **#36** | 🟡 RENDAH | **Tidak ada `UNIQUE(request_id)` pada tabel `transaksi`** — Klik ganda pada "Terima Request" bisa membuat duplikat transaksi. | DB schema |
| **#37** | 🟡 RENDAH | **Storage bucket `documents` tidak punya policy admin-read** — Admin tidak bisa melihat dokumen yang diupload dari halaman profil (bucket `documents`). Policy `documents: owner read` hanya mengizinkan pemilik. | `supabase_storage_buckets.sql:36-38` |

---

## Prinsip Eksekusi
- Kerjakan **per fase berurutan** — fase awal memutus risiko tertinggi dengan perubahan terkecil.
- Semua perubahan DB lewat **file migrasi SQL idempoten** (`DROP POLICY IF EXISTS` sebelum `CREATE`), diuji di branch Supabase / staging dulu.
- Setiap fase = 1 commit atomik + verifikasi advisor (`get_advisors`) ulang.
- Jangan menghapus policy `true` tanpa menambah policy ketat penggantinya **dalam migrasi yang sama** (hindari alur yang patah).

---

## FASE 0 — Persiapan & Pengaman (½ hari)
**Tujuan:** lingkungan aman untuk eksperimen tanpa merusak data produksi.

| # | Task | File/Lokasi | Acceptance |
|---|------|-------------|------------|
| 0.1 | ☐ Buat branch git `fix/audit-remediation` | repo | branch aktif, `master` bersih |
| 0.2 | ☐ Buat **Supabase branch** (preview) atau project staging | Supabase | DDL diuji di sana dulu |
| 0.3 | ☐ Snapshot baseline advisor keamanan & performa | `get_advisors` | output disimpan sebagai pembanding "sebelum" |
| 0.4 | ☐ Konfirmasi setting Auth: **Confirm email ON/OFF** | Supabase Auth | jadi input untuk #15 (Fase 5) |
| 0.5 | ☐ Buat folder `supabase/migrations/` & pindahkan SQL liar ke sana | repo | semua SQL ter-versioned, urut timestamp |

---

## FASE 1 — Keamanan Database Kritis 🔴 (1–2 hari)
**Tujuan:** tutup kebocoran & manipulasi data lintas-user. Memperbaiki temuan **#1, #2, #3, #18, #27**.
**File baru:** `supabase/migrations/20260606_fase1_rls_hardening.sql`

### 1.1 Bersihkan policy `request` yang `true` (#1) ☑
- `DROP POLICY` longgar: `User can insert request`, `User can update request`, `User can view related requests`.
- Pastikan policy ketat tetap ada: `request_insert_industri`, `request_select_involved`, `request_update_involved`.
- **Tambah** policy INSERT untuk UMKM pengirim (kolom `sender_umkm_id`) — agar fitur UMKM→UMKM tidak patah:
  ```sql
  CREATE POLICY request_insert_umkm ON public.request FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM umkm WHERE umkm.id = request.sender_umkm_id AND umkm.user_id = auth.uid()));
  ```
- **Acceptance:** user A tidak bisa `select`/`update` request milik user B (uji via SQL impersonasi `set role`/JWT).

### 1.2 Bersihkan policy `transaksi` yang `true` (#1) ☑
- `DROP POLICY`: `User can insert transaksi`, `User can view related transaksi`.
- Pertahankan `transaksi_select_involved`, `transaksi_update_industri`.
- **Tambah** policy INSERT untuk UMKM penerima request (karena `acceptRequest` membuat transaksi dari sisi UMKM):
  ```sql
  CREATE POLICY transaksi_insert_umkm ON public.transaksi FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
     SELECT 1 FROM request r JOIN umkm u ON u.id = r.umkm_id
     WHERE r.id = transaksi.request_id AND u.user_id = auth.uid()));
  ```
- **Tambah** policy UPDATE untuk UMKM (agar `updateTransaksiProgress` tidak gagal diam-diam — **temuan #30**):
  ```sql
  CREATE POLICY transaksi_update_umkm ON public.transaksi FOR UPDATE TO authenticated
  USING (EXISTS (
     SELECT 1 FROM request r JOIN umkm u ON u.id = r.umkm_id
     WHERE r.id = transaksi.request_id AND u.user_id = auth.uid()));
  ```
- **Acceptance:** alur `acceptRequest` tetap sukses; user lain tidak bisa membaca transaksi orang lain.

### 1.3 Tutup notifikasi spam (#2) ☑
- Ganti `notifikasi_insert_authenticated` (`true`) → hanya boleh insert untuk diri sendiri **atau** admin.
  ```sql
  DROP POLICY IF EXISTS notifikasi_insert_authenticated ON public.notifikasi;
  CREATE POLICY notifikasi_insert_self_or_admin ON public.notifikasi FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());
  ```
- **Masalah:** Server actions (request-actions, transaksi-actions) insert notifikasi ke **user lain** menggunakan client RLS. Ini akan gagal setelah policy diperketat.
- **Solusi:** Buat fungsi `SECURITY DEFINER` `kirim_notifikasi(p_target_user_id UUID, p_pesan TEXT)` yang memvalidasi bahwa pemanggil punya relasi kontekstual (request/transaksi bersama) dengan target. Atau pindahkan semua insert notifikasi ke server action yang menggunakan service-role client.
- **Acceptance:** client tidak lagi bisa insert notifikasi sembarang ke user lain.

### 1.4 View `pending_verifications` → security invoker (#3) ☑
- `ALTER VIEW public.pending_verifications SET (security_invoker = true);` dan pastikan hanya admin yang punya akses baca (RLS via tabel sumber).
- **Acceptance:** advisor `security_definer_view` hilang; non-admin tidak bisa baca view.

### 1.5 Cabut EXECUTE fungsi trigger & helper dari anon (#18) ☑
- ```sql
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.sync_user_verification_status() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.check_dokumen_update() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.konfirmasi_pesanan_selesai(integer, uuid, text) FROM PUBLIC;
  ```
- **Catatan:** `get_user_role()` dan `is_admin()` tetap perlu EXECUTE oleh `authenticated` karena digunakan di RLS policies. `konfirmasi_pesanan_selesai` hanya perlu `authenticated`.
- **Acceptance:** advisor `anon_security_definer_function_executable` hilang untuk semua trigger functions; `authenticated_security_definer_function_executable` hilang untuk trigger functions.

### 1.6 Hapus kredensial & file dev dari repo (#27, #21) ☑
- **URGENT:** `create_admin.mjs` berisi **Supabase URL, anon key, email admin, dan password plaintext**. File ini harus dihapus dan credential di-rotate.
- Hapus file dev/test: `test_db.mjs`, `test_db.ts`, `temp_list_users.mjs`, `create_admin.mjs`, `seed.mjs`, `test_write.txt`, `test_dir/`, `.cursor/`, `Proposal PPL_Kelompok B.docx (24).pdf`, `mockups/`, `request-masuk.html`, `transaksi.html`, `cleanup.bat`, `init_project.bat`.
- File SQL liar di root (`add_is_blocked_migration.sql`, `keranjang_umkm_migration.sql`, `notifikasi_rls_migration.sql`, `request_rls_migration.sql`, `progress_tracking_migration.sql`, `supabase_storage_buckets.sql`) → pindahkan ke `supabase/migrations/` atau hapus jika sudah diaplikasikan.
- Tambahkan ke `.gitignore`:
  ```
  test_dir/
  .cursor/
  mockups/
  *.mjs
  ```
- **Audit:** Sebelum hapus, pastikan tidak ada service-role key atau secret lain di file-file ini.
- **Acceptance:** Tidak ada file dev/kredensial di repo.

> **Gate Fase 1:** jalankan `get_advisors(security)` — `ERROR` = 0, `rls_policy_always_true` = 0, `anon_security_definer_function_executable` berkurang drastis.

---

## FASE 2 — Perbaikan Alur Cepat, Risiko Rendah 🔴 (½ hari)
**Tujuan:** fix berdampak besar tapi perubahan kecil. Temuan **#4, #8, #28**.

### 2.1 Keranjang `created_at` (#4)
- **Status DB:** kolom `created_at` **TIDAK ADA** di tabel `keranjang`. Code `page.tsx:45` memanggil `.order('created_at', { ascending: false })` yang akan **error**.
- **Fix:** `ALTER TABLE keranjang ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();`
- **Acceptance:** keranjang industri menampilkan item yang ada tanpa error (uji dengan 1 item).

### 2.2 `is_blocked` di middleware (#8)
- Di [middleware.ts](middleware.ts) saat ambil profil dashboard/admin, sertakan `is_blocked`. Jika `true` → `supabase.auth.signOut()` + redirect `/login?error=blocked`.
- **Status DB:** kolom `is_blocked` sudah ada di tabel `users`.
- **Acceptance:** user diblokir saat sesi aktif langsung ter-logout di navigasi berikutnya.

### 2.3 Verifikasi kepemilikan di `updateCartQuantity` & `removeFromCart` (#28)
- Di [cart-actions.ts](app/actions/cart-actions.ts#L86): sebelum update/delete, query keranjang milik user:
  ```typescript
  // Verify cart item belongs to current user
  const { data: cartItem } = await supabase
    .from('keranjang')
    .select('id, industri_id')
    .eq('id', cartId)
    .single();
  // Then verify industri_id matches user's industri
  ```
- **Acceptance:** user tidak bisa mengubah/menghapus item keranjang milik user lain.

---

## FASE 3 — Konsolidasi Storage 🟠 (1 hari)
**Tujuan:** satukan bucket & cara baca file. Temuan **#7, #16, #17, #31, #37**.
**Keputusan bucket final (usulan):**
| Jenis | Bucket | Public? | Path |
|------|--------|---------|------|
| Foto profil/cover | `avatars` | ya | `{uid}/profile.jpg` |
| Gambar produk | `produk-images` | ya | `{uid}/{produkId}.jpg` |
| Dokumen legalitas | `dokumen` | tidak | `{role}/{uid}/{jenis}.pdf` |
| Bukti transfer | `bukti-transfer` | tidak | `{uid}/{transaksiId}.pdf` |

### 3.1 Seragamkan upload dokumen profil (#7, #31)
- [ProfileClient.tsx:112-119](app/(dashboard)/profil/ProfileClient.tsx#L112): ubah bucket `documents`→`dokumen`, path `{role}/{uid}/...`, simpan **path** (bukan `getPublicUrl`) ke `dokumen_legalitas.file_url` — konsisten dengan registrasi.
- Tampilkan dokumen via `createSignedUrl` di sisi admin (VerificationTable) & profil.

### 3.2 Perbaiki preview bukti transfer (#7)
- [PaymentValidationTable.tsx:182-189](components/admin/PaymentValidationTable.tsx#L182): gunakan bucket `bukti-transfer`, hapus fallback `pembayaran`/`dokumen` yang salah.

### 3.3 Idempotensi & policy bucket (#16, #17, #37)
- Tulis ulang `supabase_storage_buckets.sql` (atau migrasi baru): `DROP POLICY IF EXISTS` dulu; hapus policy SELECT redundan pada bucket publik (`avatars: public read` & `Public can view avatars` → gabung jadi satu, cegah listing); policy read `dokumen` & `documents` tambahkan `OR public.is_admin()`.
- Tambah policy admin-read untuk bucket `documents`:
  ```sql
  CREATE POLICY "documents: admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());
  ```
- Hapus/biarkan bucket usang (`documents`, `dokumen-legalitas`) — tetapkan satu sumber kebenaran, migrasikan `file_url` lama bila perlu.
- **Acceptance:** admin bisa membuka dokumen legalitas & bukti transfer dari semua sumber; advisor `public_bucket_allows_listing` hilang.

---

## FASE 4 — Lengkapi Alur Transaksi & Pembayaran 🔴 (2–3 hari)
**Tujuan:** alur inti escrow & nilai transaksi tuntas. Temuan **#5, #6, #10, #13, #34, #35, #36**.

### 4.1 Isi `detail_transaksi` saat transaksi dibuat (#6, #10, #35)
- **Status DB:** `detail_transaksi` memiliki **0 rows** sementara ada **7 transaksi**. Semua total nilai = "Rp -".
- Di [acceptRequest](app/actions/request-actions.ts#L6): setelah insert `transaksi`, insert baris `detail_transaksi` dari `produk_id`/`equipment_id` + `kuantitas` request (harga_satuan & subtotal dari produk/equipment).
- **Catatan:** request table punya `produk_id` dan `equipment_id`, jadi bisa di-derive.
- **Acceptance:** total nilai di pantau-transaksi & admin tidak lagi "Rp -".

### 4.2 Tambah UNIQUE constraint & cegah duplikat (#36)
- ```sql
  ALTER TABLE transaksi ADD CONSTRAINT unique_request_id UNIQUE (request_id);
  ```
- Di `acceptRequest`: cek eksistensi transaksi sebelum insert (cegah duplikat / klik ganda).
- **Acceptance:** klik ganda "Terima" tidak membuat 2 transaksi.

### 4.3 `checkoutCart` sertakan item info (#34)
- Di [cart-actions.ts:120](app/actions/cart-actions.ts#L120): saat checkout, query keranjang items dan sertakan `produk_id`/`equipment_id` pada request insert.
- **Acceptance:** request dari checkout menyertakan detail item yang diminta.

### 4.4 Bangun alur upload bukti transfer Industri (#5)
- Halaman/aksi baru di transaksi industri: pilih transaksi `belum lunas`, upload bukti ke `bukti-transfer`, **insert `pembayaran`** (`transaksi_id`, `bukti_transfer=path`, `status='pending'`).
- Server action `submitPembayaran` dengan verifikasi industri pemilik transaksi (policy `pembayaran_insert_involved` sudah mendukung).
- **Acceptance:** record `pembayaran` muncul di antrean admin; admin bisa `verifyPayment`/`rejectPayment`.

### 4.5 Satukan definisi "selesai" (#13)
- Tetapkan state machine transaksi yang jelas, mis:
  `progress_status` (operasional: Menunggu Material → Diproses → Dikirim → Selesai) **terpisah** dari `status` (finansial: belum lunas → lunas).
- Sinkronkan filter tab di [TransaksiClient](app/(dashboard)/dashboard/transaksi/TransaksiClient.tsx#L49) & [TransaksiIndustriClient](app/(dashboard)/dashboard-industri/transaksi/TransaksiIndustriClient.tsx#L40) dengan state machine ini.
- Putuskan: apakah "selesai" butuh `lunas` dulu? Dokumentasikan aturannya.
- **Acceptance:** transaksi yang dikonfirmasi selesai + lunas konsisten muncul di tab "Selesai" di kedua sisi.

---

## FASE 5 — Hardening Server Actions & Otorisasi 🟠 (1–2 hari)
**Tujuan:** validasi kepemilikan di server. Temuan **#9, #11, #12, #14, #15, #20, #23, #29, #30, #32, #33**.

| # | Task | File |
|---|------|------|
| 5.1 | ☐ `konfirmasi_pesanan_selesai`: derive `umkm_user_id` & nama industri **di dalam RPC** dari `request`/`auth.uid()`, hapus param client (#11, #33) | RPC + [pantau-transaksi/actions.ts](app/(dashboard)/pantau-transaksi/actions.ts) |
| 5.2 | ☐ `updateTransaksiProgress`: verifikasi transaksi milik UMKM pemanggil (query via request→umkm→user_id) (#12, #30) | [transaksi-actions.ts](app/actions/transaksi-actions.ts) |
| 5.3 | ☐ `verifyPayment`/`rejectPayment`: derive `industriUserId` & `umkmUserId` dari transaksi di server, hapus parameter client (#32) | [admin-actions.ts](app/actions/admin-actions.ts) |
| 5.4 | ☐ Cart UMKM: **migrasikan `KeranjangClient` ke server action** — hapus operasi DB client-side (insert request, insert notifikasi, delete keranjang). Gunakan `checkoutCart` yang sudah ada atau buat `checkoutCartUmkm` (#9, #29) | [KeranjangClient.tsx](app/(dashboard)/keranjang/KeranjangClient.tsx) + [cart-actions.ts](app/actions/cart-actions.ts) |
| 5.5 | ☐ Ganti `.single()` rawan → `.maybeSingle()` + handle null pada actions (#23) | `app/actions/*`, `request-actions.ts` |
| 5.6 | ☐ Registrasi: amankan terhadap "Confirm email ON" — pindahkan upload dokumen ke setelah sesi aktif / server route service-role (#15) | [register/umkm](app/(auth)/register/umkm/page.tsx), [register/industri](app/(auth)/register/industri/page.tsx) |
| 5.7 | ☐ `verifyUserDocuments`: verifikasi **semua** dokumen user secara eksplisit; tangani kasus campuran ditolak+menunggu & user tanpa dokumen (#20) | [admin-actions.ts](app/actions/admin-actions.ts) |
| 5.8 | ☐ Konsolidasi `CartClient` vs `KeranjangClient`; sertakan `produk_id`/`equipment_id` di request checkout (#14) | [keranjang/](app/(dashboard)/keranjang/) |

---

## FASE 6 — Kebersihan, Auth Policy & UX 🟢 (½ hari)
**Tujuan:** rapikan. Temuan **#19, #22, #24, #25, #26**.

- 6.1 ☐ Aktifkan **Leaked Password Protection** di Supabase Dashboard (Auth → Settings → Security) + validasi panjang/kompleksitas password server-side (#19).
- 6.2 ☐ Verifikasi semua `revalidatePath` cocok dengan route group `(dashboard)` (#22).
  - **Temuan:** `revalidatePath('/dashboard')`, `/request-masuk`, `/pencarian`, `/keranjang`, `/admin`, `/pantau-transaksi` digunakan. Ini benar karena Next.js `revalidatePath` menerima URL path (bukan file path), dan route group `(dashboard)` tidak menjadi bagian dari URL.
  - **Perlu dicek:** Apakah revalidasi sudah mencakup semua halaman terdampak? Misal, `acceptRequest` harus revalidate `/pantau-transaksi` juga.
- 6.3 ☐ Perbaiki input kuantitas & validasi stok di cart (#24).
- 6.4 ☐ Implementasi/hapus tombol "Ajukan Komplain" placeholder (#25).
  - **Status kode:** `PantauTransaksiClient.tsx:403` → `alert("Fitur komplain akan segera hadir.")` — placeholder aktif.
- 6.5 ☐ Jangan menyamarkan data kosong sebagai "Rp -"; tampilkan indikator bila `detail_transaksi` hilang (#26).
  - **Status kode:** `PantauTransaksiClient.tsx:127` → `formatRupiah` return "Rp -" jika `!val` — ini menipu user karena bisa berarti data tidak ada.

---

## Urutan & Dependensi
```
Fase 0 ─► Fase 1 ─► Fase 2 ─┬─► Fase 3 ─► Fase 4 ─► Fase 5 ─► Fase 6
                            └─ (Fase 2 & 3 bisa paralel)
```
- **Fase 1 wajib pertama** (keamanan); Fase 5.2/5.3 bergantung pada migrasi RLS Fase 1.
- **Fase 4 bergantung Fase 3** (bucket bukti-transfer harus siap).
- Fase 2 & 3 saling independen → bisa paralel bila ada 2 orang.

## Estimasi Total
~7–10 hari kerja (1 dev). Jalur kritis: Fase 1 → 4.

## Definition of Done (global)
- [ ] `get_advisors(security)`: 0 ERROR; WARN hanya yang disengaja & terdokumentasi.
- [ ] Uji lintas-akun: user tidak bisa baca/ubah data milik user lain (request, transaksi, notifikasi, dokumen, keranjang).
- [ ] Alur happy-path end-to-end lulus: register → verifikasi admin → request → terima → transaksi+detail → upload bukti → validasi admin → lunas → konfirmasi selesai → ulasan.
- [ ] User diblokir tidak bisa mengakses dashboard.
- [ ] Tidak ada file dev/kredensial di repo.
- [ ] `detail_transaksi` terisi saat transaksi dibuat — total nilai tampil benar.
- [ ] Semua server action memvalidasi kepemilikan resource sebelum operasi.
- [ ] Leaked Password Protection aktif di Supabase Auth.
