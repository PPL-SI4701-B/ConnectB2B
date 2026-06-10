import { Page, expect } from '@playwright/test';

/**
 * Helper autentikasi untuk E2E ConnectB2B.
 *
 * Halaman /login memakai alur 2 langkah:
 *   1. Pilih peran (UMKM / Industri / Admin)
 *   2. Isi email + kata sandi -> klik "Lanjutkan Masuk"
 *
 * Setelah login berhasil, aplikasi redirect ke dashboard sesuai peran.
 */

export type Role = 'UMKM' | 'Industri' | 'Admin';

interface Creds {
  email: string | undefined;
  password: string | undefined;
}

function getCreds(role: Role): Creds {
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

/**
 * Lewati test (skip) jika kredensial untuk peran tertentu belum diisi di .env.test.
 * Mengembalikan true jika kredensial TERSEDIA.
 */
export function hasCreds(role: Role): boolean {
  const { email, password } = getCreds(role);
  return !!email && !!password;
}

/**
 * Login lewat GUI (mengisi form sungguhan) sebagai peran tertentu.
 * Memverifikasi redirect ke dashboard yang sesuai.
 */
export async function login(page: Page, role: Role): Promise<void> {
  const { email, password } = getCreds(role);
  if (!email || !password) {
    throw new Error(
      `Kredensial akun ${role} belum diisi di .env.test (E2E_${role.toUpperCase()}_EMAIL / _PASSWORD).`
    );
  }

  await page.goto('/login');

  // Langkah 1: pilih peran
  await page.getByRole('button', { name: new RegExp(`Masuk sebagai ${role}`, 'i') }).click();

  // Langkah 2: isi kredensial
  await page.getByPlaceholder('nama@perusahaan.com').fill(email);
  await page.getByPlaceholder('Minimal 8 karakter').fill(password);
  await page.getByRole('button', { name: /Lanjutkan Masuk/i }).click();

  // Verifikasi sampai di dashboard sesuai peran
  await expect(page).toHaveURL(dashboardPath(role), { timeout: 20_000 });
}

/** Logout via tombol keluar di sidebar (best-effort). */
export async function logout(page: Page): Promise<void> {
  const logoutBtn = page.getByRole('button', { name: /keluar|logout/i }).first();
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  }
}
