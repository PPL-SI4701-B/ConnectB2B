import { test, expect } from '@playwright/test';
import { login, dashboardPath } from './helpers/auth';

test.describe('FR-20: Dashboard Admin + Validasi Transaksi', () => {
  test.beforeEach(async ({ page }) => {
    // Login sebagai admin
    await login(page, 'Admin');
  });

  test('TC-20-01: Dashboard admin tampil', async ({ page }) => {
    await expect(page).toHaveURL(dashboardPath('Admin'), { timeout: 15000 });

    // Cek header utama
    await expect(page.getByRole('heading', { name: 'Monitoring Platform Utama' })).toBeVisible();

    // Cek 4 Stat Cards utama
    await expect(page.getByRole('heading', { name: 'Total Transaksi Sukses' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pengguna Tervalidasi' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Laporan Pelanggaran Konten' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Industri Aktif (Terverifikasi)' })).toBeVisible();

    // Cek tabel-tabel utama
    await expect(page.getByRole('heading', { name: 'Antrean Verifikasi Dokumen Akun Baru' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Antrean Validasi Pembayaran Escrow' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pencairan Dana ke UMKM' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Manajemen Pengguna' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Moderasi Konten Produk' })).toBeVisible();
  });

  test('TC-20-02: Stat cards akurat', async ({ page }) => {
    await expect(page).toHaveURL(dashboardPath('Admin'), { timeout: 15000 });

    // Memastikan isi stat card ter-render dengan angka, minimal kita cek elemen angka tidak kosong
    const statsCardContainer = page.locator('.grid.grid-cols-1.md\\:grid-cols-2');
    await expect(statsCardContainer).toBeVisible();

    // Cek apakah minimal ada angka di dalam stat cards
    // Di komponen kita ada span dengan class "text-3xl font-bold"
    const numbers = page.locator('span.text-3xl.font-bold');
    
    // Harus ada 4 angka untuk 4 stat cards
    await expect(numbers).toHaveCount(4);

    // Ambil teks dari salah satu angka (misal Total Transaksi)
    const txCount = await numbers.first().textContent();
    expect(txCount).not.toBeNull();
    // Memastikan itu berupa angka
    expect(!isNaN(Number(txCount))).toBeTruthy();
  });
});
