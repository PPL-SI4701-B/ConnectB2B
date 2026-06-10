const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log('Navigating...');
  const start = Date.now();
  try {
    await page.goto('http://localhost:3000/katalog-publik', { timeout: 45000 });
    console.log('Loaded in', Date.now() - start, 'ms');
  } catch(e) {
    console.log('Error:', e.message);
  }
  await browser.close();
})();
