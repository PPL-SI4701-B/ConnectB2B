import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Muat kredensial akun test dari .env.test (email/password UMKM, Industri, Admin)
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * Konfigurasi E2E Testing ConnectB2B (FR-01..FR-29)
 *
 * Menjalankan test:
 *   - GUI terlihat (browser terbuka & klik-klik):  npx playwright test --headed
 *   - Mode UI interaktif (paling enak untuk demo):  npx playwright test --ui
 *   - Headless (cepat, untuk CI):                   npx playwright test
 *   - Lihat laporan HTML setelah run:               npx playwright show-report
 */
export default defineConfig({
  testDir: './e2e',
  // Jalankan secara paralel untuk mempercepat eksekusi test
  fullyParallel: true,
  // Gunakan worker sesuai jumlah core CPU (di lokal), atau 1 jika di CI
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Pelan sedikit supaya gerakan klik terlihat jelas saat --headed (demo ke dosen)
    launchOptions: {
      slowMo: process.env.E2E_SLOWMO ? Number(process.env.E2E_SLOWMO) : 0,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Jalankan test terhadap PRODUCTION BUILD (next build + next start) di port 3100,
  // dengan env diarahkan ke DATABASE TEST (project ConnectB2B-Test).
  // Alasan:
  //   - Pakai database test kosong/terpisah → tidak mengotori data asli (permintaan dosen)
  //   - Semua route sudah ter-compile → tidak ada timeout "cold compile" seperti di dev
  //   - RAM hemat (tidak ada compiler/HMR) → laptop tidak freeze
  //   - Port 3100 → tidak bentrok dengan `npm run dev` (3000) yang memakai database asli
  //
  // env di bawah meng-override nilai di .env.local saat build & start (process.env menang
  // atas file .env di Next.js), jadi dev sehari-hari Anda tetap memakai database asli.
  webServer: {
    command: 'npm run build && npm run start -- -p 3100',
    url: 'http://localhost:3100/login',
    reuseExistingServer: true,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
});
