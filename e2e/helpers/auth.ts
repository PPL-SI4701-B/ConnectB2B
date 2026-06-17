import { Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Helper autentikasi untuk E2E ConnectB2B.
 *
 * Login pertama kali lewat form GUI, lalu session di-cache di playwright/.auth/.
 * Test berikutnya yang perlu role yang sama akan pakai session cache → tidak perlu
 * login ulang ke Supabase sehingga menghindari rate-limit.
 */

export type Role = 'UMKM' | 'Industri' | 'Admin';

const AUTH_CACHE_DIR = path.join(__dirname, '../../playwright/.auth');

function getCreds(role: Role) {
  switch (role) {
    case 'UMKM':
      return { email: process.env.E2E_UMKM_EMAIL, password: process.env.E2E_UMKM_PASSWORD };
    case 'Industri':
      return { email: process.env.E2E_INDUSTRI_EMAIL, password: process.env.E2E_INDUSTRI_PASSWORD };
    case 'Admin':
      return { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
  }
}

/** Path dashboard tujuan setelah login, per peran. */
export function dashboardPath(role: Role): RegExp {
  switch (role) {
    case 'UMKM':
      return /\/dashboard(?!-industri)/;
    case 'Industri':
      return /\/dashboard-industri/;
    case 'Admin':
      return /\/admin/;
  }
}

function cacheFile(role: Role): string {
  return path.join(AUTH_CACHE_DIR, `${role.toLowerCase()}.json`);
}

/**
 * Lewati test (skip) jika kredensial untuk peran tertentu belum diisi di .env.test.
 * Mengembalikan true jika kredensial TERSEDIA.
 */
export function hasCreds(role: Role): boolean {
  const { email, password } = getCreds(role);
  return !!email && !!password;
}

/**
 * Hapus cache session agar login berikutnya paksa lewat form lagi.
 * Berguna setelah logout (token dicabut oleh Supabase).
 */
export function clearAuthCache(role: Role): void {
  const file = cacheFile(role);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/**
 * Login lewat GUI (mengisi form sungguhan) sebagai peran tertentu.
 *
 * Strategi cache:
 *   1. Jika ada cache → restore cookies → coba buka dashboard
 *   2. Jika berhasil → return (tidak perlu login ulang ke Supabase)
 *   3. Jika gagal (token kedaluwarsa/dicabut) → hapus cache → login form biasa → simpan cache baru
 */
export async function login(page: Page, role: Role): Promise<void> {
  const { email, password } = getCreds(role);
  if (!email || !password) {
    throw new Error(
      `Kredensial akun ${role} belum diisi di .env.test (E2E_${role.toUpperCase()}_EMAIL / _PASSWORD).`
    );
  }

  const cache = cacheFile(role);

  // Coba pakai session yang sudah di-cache
  if (fs.existsSync(cache)) {
    try {
      const state = JSON.parse(fs.readFileSync(cache, 'utf8'));
      if (state.cookies?.length) {
        await page.context().addCookies(state.cookies);
      }
      // Navigasi ke dashboard — middleware akan redirect ke /login jika session tidak valid
      const dashPath = role === 'Admin' ? '/admin'
        : role === 'Industri' ? '/dashboard-industri'
        : '/dashboard';
      await page.goto(dashPath, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      if (dashboardPath(role).test(page.url())) {
        await waitDashboardReady(page); // pastikan halaman ter-hidrasi sebelum dipakai
        return; // Session masih valid, tidak perlu login ulang
      }
      // Session tidak valid, bersihkan dan lanjut ke login form
      await page.context().clearCookies();
      fs.unlinkSync(cache);
    } catch {
      await page.context().clearCookies().catch(() => {});
      if (fs.existsSync(cache)) fs.unlinkSync(cache);
    }
  }

  // Login lewat form GUI
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(`Masuk sebagai ${role}`, 'i') }).click();
  await page.getByPlaceholder('nama@perusahaan.com').fill(email);
  await page.getByPlaceholder('Minimal 8 karakter').fill(password);
  await page.getByRole('button', { name: /Lanjutkan Masuk/i }).click();
  await expect(page).toHaveURL(dashboardPath(role), { timeout: 25_000 });
  await waitDashboardReady(page); // pastikan ter-hidrasi sebelum dipakai

  // Simpan session untuk test berikutnya
  fs.mkdirSync(AUTH_CACHE_DIR, { recursive: true });
  await page.context().storageState({ path: cache });
}

/**
 * Tunggu sampai layout dashboard ter-hidrasi (tombol "Keluar" di sidebar siap).
 * Tanpa ini, klik pertama pada <Link> sidebar kadang tidak memicu navigasi
 * karena React belum selesai hydrate.
 */
async function waitDashboardReady(page: Page): Promise<void> {
  await page.getByRole('button', { name: /keluar|logout/i }).first()
    .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState('load').catch(() => {});
}

/** Logout via tombol keluar di sidebar (best-effort). Hapus cache setelah logout. */
export async function logout(page: Page, role?: Role): Promise<void> {
  const logoutBtn = page.getByRole('button', { name: /keluar|logout/i }).first();
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  }
  // Hapus cache karena token sudah dicabut oleh Supabase setelah logout
  if (role) clearAuthCache(role);
}
