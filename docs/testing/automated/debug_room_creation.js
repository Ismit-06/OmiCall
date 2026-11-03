const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_PAGE_ERROR:', err.message));
  page.on('dialog', async dialog => {
    console.log('BROWSER_ALERT:', dialog.message());
    await dialog.dismiss();
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // 1. Click Login
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Login as Admin'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Click "Create Room" to reveal form
  console.log('Clicking "Create Room"...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText === 'Create Room');
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Click "Create" to submit
  console.log('Clicking "Create" submit button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText === 'Create');
    if (b) b.click();
  });

  await new Promise(r => setTimeout(r, 2000));
  console.log('Current URL:', page.url());

  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('Page content after creation:\n', pageText);

  await browser.close();
})();
