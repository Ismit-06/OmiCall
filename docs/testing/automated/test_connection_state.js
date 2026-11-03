const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // 1. Dev login
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Login as Admin'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Click Create Room
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText === 'Create Room');
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Click Create button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText === 'Create');
    if (b) b.click();
  });

  // Wait 6 seconds and observe state transitions
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const statusText = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Status:') ? text.split('Status:')[1].split('\n')[0].trim() : 'no-status';
    });
    console.log(`Second ${i + 1}: LiveKit call status =`, statusText);
  }

  await browser.close();
})();
