import { test, expect } from '@playwright/test';
import { login, hasCreds } from './helpers/auth';

/**
 * FR-11: Keranjang Kolaborasi (Industri)
 * Industri membuka keranjang; menampilkan daftar item atau status kosong.
 * Aturan bisnis: keranjang hanya boleh berisi item dari satu UMKM.
 */
test.describe('FR-11: Keranjang Kolaborasi', () => {
  test.skip(!hasCreds('Industri'), 'Kredensial Industri belum diisi di .env.test');

  test('TC-11-01: Buka Keranjang dari sidebar', async ({ page }) => {
    await login(page, 'Industri');
    await page.getByRole('link', { name: /Keranjang Kolaborasi/i }).click();
    await expect(page).toHaveURL(/\/keranjang/);
    await expect(page.getByRole('heading', { name: /Keranjang Kolaborasi/i })).toBeVisible();
  });

  test('TC-11-02: Menampilkan daftar item atau pesan keranjang kosong', async ({ page }) => {
    await login(page, 'Industri');
    await page.goto('/keranjang');
    const kosong = page.getByText(/Keranjang Anda Kosong/i);
    const checkout = page.getByRole('button', { name: /Review & Ajukan Request/i });
    // Salah satu kondisi harus benar: kosong, atau ada tombol checkout
    await expect(kosong.or(checkout).first()).toBeVisible({ timeout: 15_000 });
  });
});
