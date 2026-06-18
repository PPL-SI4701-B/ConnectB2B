const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login');
  await page.getByRole('button', { name: /Masuk sebagai Industri/i }).click();
  await page.getByPlaceholder('nama@email.com').fill('industrianon1@gmail.com');
  await page.getByPlaceholder('Masukkan kata sandi').fill('12345678');
  await page.getByRole('button', { name: /Masuk ke Akun/i }).click();
  await page.waitForURL('**/dashboard-industri');
  
  await page.goto('http://localhost:3000/katalog-publik/37');
  await page.getByRole('button', { name: /Ajukan Kerjasama/i }).click();
  
  try {
    await page.waitForURL('**/keranjang', { timeout: 5000 });
    console.log("SUCCESS");
  } catch (e) {
    console.log("FAILED TO NAVIGATE. Body:");
    const text = await page.content();
    if (text.includes('bg-red-50')) {
      console.log("FOUND ERROR BOX!");
    }
  }
  await browser.close();
})();
