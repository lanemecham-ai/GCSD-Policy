import { chromium } from 'playwright';

const VIEWER_URL = 'https://meetings.boardbook.org/Documents/WebViewer/3241?file=cb3ab556-818b-4221-a01e-12caecb1e758';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Intercept all requests to find the document URL
const docRequests = [];
page.on('request', req => {
  const url = req.url();
  if (!url.includes('analytics') && !url.includes('google') && !url.includes('.css') && !url.includes('.js') && !url.includes('.png') && !url.includes('.ico')) {
    docRequests.push(url);
  }
});

await page.goto(VIEWER_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

console.log('--- Interesting Network Requests ---');
docRequests.forEach(u => console.log(u));

// Try to get text from the WebViewer content
const iframes = page.frames();
console.log('\n--- Frame URLs ---');
iframes.forEach(f => console.log(f.url()));

// Try to get text from each frame
for (const frame of iframes) {
  try {
    const text = await frame.evaluate(() => document.body?.innerText || '');
    if (text && text.length > 200) {
      console.log(`\n--- Text from frame ${frame.url().substring(0, 80)} ---`);
      console.log(text.substring(0, 3000));
    }
  } catch (e) {
    // cross-origin frames will error
  }
}

await browser.close();
