const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching headless browser to test real UI interactions...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const page = await browser.newPage();

  // Listen to browser console and errors
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async dialog => {
    console.log('PAGE DIALOG (Alert):', dialog.message());
    await dialog.dismiss();
  });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  console.log('Clicking "Login as Admin (Sai)" button...');
  const devLoginBtn = await page.waitForSelector('xpath///button[contains(text(), "Login as Admin (Sai)")]');
  await devLoginBtn.click();

  // Wait for login to complete and UI to update
  await page.waitForSelector('xpath///span[contains(text(), "Sai (Host)")]', { timeout: 5000 });
  console.log('Logged in successfully in browser!');

  console.log('Clicking "Create Room" to open creation form...');
  const createRoomBtn = await page.waitForSelector('xpath///button[contains(text(), "Create Room")]');
  await createRoomBtn.click();

  // Wait for "Create" button in the form
  const confirmCreateBtn = await page.waitForSelector('xpath///button[contains(text(), "Create") and not(contains(text(), "Room"))]', { timeout: 5000 });
  console.log('Submitting room creation form...');
  await confirmCreateBtn.click();

  // Wait for navigation to /room/
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => console.log('Navigation or URL change completed'));

  console.log('Current URL after creation:', page.url());

  // Wait to see if error banner appears or if video call connects
  await new Promise(r => setTimeout(r, 3000));

  const content = await page.content();
  if (content.includes('HTTP 401') || content.includes('HTTP 409') || content.includes('Failed to join')) {
    console.log('ERROR FOUND ON PAGE!');
    const errorText = await page.evaluate(() => {
      const el = document.querySelector('div[style*="background: rgb(254, 226, 226)"]');
      return el ? el.innerText : 'Unknown error element';
    });
    console.log('Error banner text:', errorText);
  } else {
    console.log('SUCCESS: Room page loaded cleanly without errors.');
    const roomHeading = await page.evaluate(() => {
      const h = document.querySelector('h2');
      return h ? h.innerText : 'No h2';
    });
    console.log('Heading on room page:', roomHeading);
  }

  await browser.close();
})();
