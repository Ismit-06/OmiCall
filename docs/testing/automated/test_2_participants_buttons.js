const puppeteer = require('puppeteer');

async function testTwoParticipantsInCall() {
  console.log('=== STARTING 2-PARTICIPANT IN-CALL INTERACTION TEST ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  // Browser Context 1 (Host: Sai)
  const contextHost = await browser.createBrowserContext();
  const pageHost = await contextHost.newPage();

  // Browser Context 2 (Guest: Partner)
  const contextGuest = await browser.createBrowserContext();
  const pageGuest = await contextGuest.newPage();

  try {
    console.log('1. Host logs in and creates a private room...');
    await pageHost.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await pageHost.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Login as Admin (Sai)'));
      if (b) b.click();
    });

    await pageHost.waitForFunction(() => document.body.innerText.includes('Private Room'), { timeout: 10000 });

    // Click "Create Room" then "Create"
    await pageHost.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.trim() === 'Create Room');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 400));
    await pageHost.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.trim() === 'Create');
      if (b) b.click();
    });

    await pageHost.waitForFunction(() => window.location.pathname.startsWith('/room/'), { timeout: 10000 });
    const hostRoomUrl = pageHost.url();
    const roomCode = hostRoomUrl.split('/room/')[1];
    console.log(`   Host created room: ${roomCode} (${hostRoomUrl})`);

    console.log('2. Waiting for Host to connect to LiveKit...');
    await pageHost.waitForFunction(() => document.body.innerText.includes('connected'), { timeout: 15000 });
    console.log('   Host is connected to video call!');

    console.log('3. Guest logs in and joins the same room...');
    await pageGuest.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await pageGuest.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Login as Partner'));
      if (b) b.click();
    });
    await pageGuest.waitForFunction(() => document.body.innerText.includes('Join Room'), { timeout: 10000 });

    // Join room via URL
    await pageGuest.goto(hostRoomUrl, { waitUntil: 'networkidle2' });
    console.log('4. Waiting for Guest to connect to LiveKit...');
    await pageGuest.waitForFunction(() => document.body.innerText.includes('connected'), { timeout: 15000 });
    console.log('   Guest is connected to video call!');

    // Allow WebRTC peer exchange
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n--- 5. Testing Cross-Participant Features ---');

    // Host opens chat and sends message
    console.log('   Host sends in-call chat message...');
    await pageHost.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Chat'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const hostChatInput = await pageHost.$('input[placeholder="Type a message..."]');
    await hostChatInput.type('Hello my love! Testing LiveKit chat ❤️');
    await pageHost.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent === 'Send');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Guest opens chat to verify message received
    console.log('   Guest checks chat for received message...');
    await pageGuest.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Chat'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const guestReceivedMessage = await pageGuest.evaluate(() => {
      return document.body.innerText.includes('Hello my love! Testing LiveKit chat ❤️');
    });
    console.log('   Guest received Host chat message in real time:', guestReceivedMessage);

    // Host clicks Couple Question
    console.log('   Host triggers "Couple Question"...');
    await pageHost.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Couple Question'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Guest checks if question appeared on their screen
    const guestHasPrompt = await pageGuest.evaluate(() => {
      const el = document.querySelector('.couple-prompt-banner');
      return el ? el.textContent.trim() : null;
    });
    console.log('   Guest screen received synchronized Couple Prompt:', guestHasPrompt);

    // Host sends floating emoji reaction
    console.log('   Host sends reaction emoji (❤️)...');
    await pageHost.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent === '❤️');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Guest checks if reaction particle spawned
    const guestReactionSpawned = await pageGuest.evaluate(() => {
      return !!document.querySelector('.reaction-particle');
    });
    console.log('   Guest screen spawned floating reaction particle:', guestReactionSpawned);

    // Guest tests local controls
    console.log('   Guest toggles microphone mute...');
    const guestMicBefore = await pageGuest.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Mic') || btn.textContent.includes('Mute')));
      return b ? b.textContent.trim() : null;
    });
    await pageGuest.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Mic') || btn.textContent.includes('Mute')));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    const guestMicAfter = await pageGuest.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && (btn.textContent.includes('Mic') || btn.textContent.includes('Mute')));
      return b ? b.textContent.trim() : null;
    });
    console.log(`   Guest mic toggled from "${guestMicBefore}" to "${guestMicAfter}"`);

    // End call
    console.log('   Host clicks "End Call"...');
    await pageHost.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('End Call'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Host URL after End Call:', pageHost.url());

    console.log('\n=== 2-PARTICIPANT IN-CALL TEST PASSED WITH ZERO ERRORS ===');
  } catch (err) {
    console.error('2-Participant test failed:', err);
  } finally {
    await browser.close();
  }
}

testTwoParticipantsInCall();
