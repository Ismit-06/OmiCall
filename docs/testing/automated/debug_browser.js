const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_PAGE_ERROR:', err.message));
  page.on('requestfailed', req => console.log('BROWSER_FAILED_REQ:', req.url(), req.failure().errorText));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Get current buttons
  const buttons = await page.$$eval('button', btns => btns.map(b => b.innerText));
  console.log('Available buttons on homepage:', buttons);

  // Click login
  console.log('Invoking devLogin in page context...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const adminBtn = btns.find(b => b.innerText.includes('Login as Admin'));
    if (adminBtn) adminBtn.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  const afterButtons = await page.$$eval('button', btns => btns.map(b => b.innerText));
  console.log('Buttons after login click:', afterButtons);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body snippet:\n', bodyText.substring(0, 300));

  await browser.close();
})();
