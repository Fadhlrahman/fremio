import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('console', (msg) => {
    console.log('BROWSER', msg.type(), msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('PAGEERROR', err.message);
  });
  try {
    await page.goto('https://localhost:5174/fremio/', { waitUntil: 'networkidle' });
    console.log('Loaded page');
  } catch (error) {
    console.error('Navigation failed', error);
  }
  await browser.close();
})();
