const puppeteer = require('puppeteer');

async function testButtons() {
  console.log('Launching browser with fake media stream...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access'
    ]
  });

  const page = await browser.newPage();

  const logs = [];
  const errors = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(`[PAGE_ERROR] ${err.message}`));

  try {
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    console.log('2. Dev login as Alice...');
    await page.waitForSelector('.btn');
    // Click dev login button for Alice
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Login as Admin (Sai)'));
      if (b) b.click();
    });

    await page.waitForFunction(() => !document.body.innerText.includes('Welcome to Love Video Call') && document.body.innerText.includes('Private Room'), { timeout: 10000 });
    console.log('Logged in successfully!');

    console.log('3. Creating a new private room...');
    // Click "Create Room" to open the form
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.trim() === 'Create Room');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Now click the submit "Create" button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.trim() === 'Create');
      if (b) b.click();
    });

    await page.waitForFunction(() => window.location.pathname.startsWith('/room/'), { timeout: 10000 });
    console.log('Navigated to room URL:', page.url());

    console.log('Waiting for LiveKit connection...');
    await page.waitForFunction(
      () => document.body.innerText.includes('connected') || document.body.innerText.includes('Status: connected'),
      { timeout: 15000 }
    );
    console.log('Video call connected!');

    // Let's test the buttons one by one!
    console.log('\n--- Testing In-Call Controls ---');

    // 1. Test Chat Button
    console.log('1. Testing "Chat" button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Chat'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 600));
    const hasChatDrawer = await page.evaluate(() => document.body.innerText.includes('In-Call Text Chat'));
    console.log('  Chat drawer opened:', hasChatDrawer);

    // Type a test chat message
    const chatInput = await page.$('input[placeholder="Type a message..."]');
    if (chatInput) {
      await chatInput.type('Hello from automated test!');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(btn => btn.textContent === 'Send');
        if (b) b.click();
      });
      await new Promise(r => setTimeout(r, 600));
      const messageSent = await page.evaluate(() => document.body.innerText.includes('Hello from automated test!'));
      console.log('  Message sent & rendered in chat:', messageSent);
    }

    // 2. Test Couple Question Button
    console.log('\n2. Testing "✨ Couple Question" button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Couple Question'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 600));
    const promptBanner = await page.$('.couple-prompt-banner');
    console.log('  Couple Question banner appeared:', !!promptBanner);
    if (promptBanner) {
      const promptText = await page.evaluate(el => el.textContent, promptBanner);
      console.log('  Prompt Text:', promptText.replace('Dismiss', '').trim());
    }

    // 3. Test Reaction Emojis
    console.log('\n3. Testing Reaction Emoji buttons...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent === '❤️');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 600));
    const reactionParticle = await page.$('.reaction-particle');
    console.log('  Reaction particle spawned:', !!reactionParticle);

    // 4. Test Mute/Unmute Mic Button
    console.log('\n4. Testing Mic button...');
    const initialMicText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Mic') || btn.textContent.includes('Mute')));
      return b ? b.textContent.trim() : null;
    });
    console.log('  Initial mic button text:', initialMicText);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Mic') || btn.textContent.includes('Mute')));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    const newMicText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Mic') || btn.textContent.includes('Mute')));
      return b ? b.textContent.trim() : null;
    });
    console.log('  After click mic button text:', newMicText);
    console.log('  Mic button state toggled:', initialMicText !== newMicText);

    // 5. Test Camera On/Off Button
    console.log('\n5. Testing Camera button...');
    const initialCamText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Video') || btn.textContent.includes('Cam')));
      return b ? b.textContent.trim() : null;
    });
    console.log('  Initial cam button text:', initialCamText);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Video') || btn.textContent.includes('Cam')));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    const newCamText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Video') || btn.textContent.includes('Cam')));
      return b ? b.textContent.trim() : null;
    });
    console.log('  After click cam button text:', newCamText);
    console.log('  Cam button state toggled:', initialCamText !== newCamText);

    // 6. Test Screen Share Button
    console.log('\n6. Testing Screen Share button...');
    const initialShareText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Share Screen'));
      return b ? b.textContent.trim() : null;
    });
    console.log('  Initial share button text:', initialShareText);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Share Screen'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    const newShareText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Share') || btn.textContent.includes('Screen')));
      return b ? b.textContent.trim() : null;
    });
    console.log('  After click share button text:', newShareText);

    // 7. Test Copy Invite Link Button & Toast
    console.log('\n7. Testing "Copy Invite Link" button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Copy Invite Link'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const toast = await page.$('.toast');
    console.log('  Toast notification rendered:', !!toast);

    // 8. Test End Call Button
    console.log('\n8. Testing "End Call" button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('End Call'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    console.log('  URL after End Call:', page.url());
    console.log('  Navigated away from room:', !page.url().includes('/room/'));

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    if (errors.length > 0) {
      console.log('\nCaptured Page Errors:');
      errors.forEach(e => console.log('  ', e));
    }
    console.log('\nAll Console Logs:');
    logs.forEach(l => console.log('  ', l));

    await browser.close();
  }
}

testButtons();
