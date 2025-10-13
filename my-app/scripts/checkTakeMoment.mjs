import { chromium } from 'playwright';

const SERVER_URL = process.env.SERVER_URL || 'https://localhost:5183/fremio/take-moment';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}]`, msg.text());
  });
  page.on('pageerror', (error) => {
    console.error('[pageerror]', error);
  });

  try {
    const response = await page.goto(SERVER_URL, { waitUntil: 'load', timeout: 30_000 });
    if (!response) {
      console.error('No response received when navigating to Take Moment page');
    } else {
      console.log('HTTP status:', response.status());
      if (!response.ok()) {
        console.error('Navigation failed with status', response.status());
      }
    }

    await page.waitForTimeout(3_000);
  } catch (error) {
    console.error('Navigation error:', error);
  } finally {
    await browser.close();
  }
}

run();
