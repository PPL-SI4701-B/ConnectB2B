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

  // Otomatis menjalankan `npm run dev` sebelum test, lalu mematikannya setelah selesai.
  // Jika server sudah jalan sendiri, Playwright akan memakai yang ada (reuseExistingServer).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
