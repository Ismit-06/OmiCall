const http = require('http');

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        let cookieVal = cookie;
        if (setCookie && setCookie.length > 0) {
          cookieVal = setCookie[0].split(';')[0];
        }
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), cookie: cookieVal });
        } catch {
          resolve({ status: res.statusCode, raw: data, cookie: cookieVal });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('--- 1. Login User A (Host) ---');
  const userA = await request('POST', '/api/auth/dev-login', { name: 'Sai', email: 'sai@test.com', role: 'admin' });
  console.log('User A Logged in:', userA.status, userA.data.user.displayName, 'Cookie:', userA.cookie);

  console.log('--- 2. Login User B (Guest) ---');
  const userB = await request('POST', '/api/auth/dev-login', { name: 'Partner', email: 'partner@test.com', role: 'user' });
  console.log('User B Logged in:', userB.status, userB.data.user.displayName, 'Cookie:', userB.cookie);

  console.log('--- 3. User A Creates a Room with password ---');
  const roomRes = await request('POST', '/api/rooms', { password: 'secretpassword' }, userA.cookie);
  console.log('Room Created:', roomRes.status, 'Code:', roomRes.data.roomCode, 'HostId:', roomRes.data.hostId);
  const code = roomRes.data.roomCode;

  console.log('--- 4. User A (Host) enters the room page (should join automatically without 409) ---');
  const hostJoin = await request('POST', `/api/rooms/${code}/join`, { password: '' }, userA.cookie);
  console.log('Host Re-join check:', hostJoin.status, 'Status:', hostJoin.data ? hostJoin.data.status : hostJoin.raw);

  console.log('--- 5. User A gets LiveKit video token ---');
  const tokenA = await request('GET', `/api/calls/token/room/${code}`, null, userA.cookie);
  console.log('User A Token:', tokenA.status, 'Has Token:', !!tokenA.data.token, 'LiveKit URL:', tokenA.data.livekitUrl);

  console.log('--- 6. User B enters room with wrong password (must fail 403) ---');
  const wrongJoin = await request('POST', `/api/rooms/${code}/join`, { password: 'wrong' }, userB.cookie);
  console.log('User B Wrong Password:', wrongJoin.status, wrongJoin.data ? wrongJoin.data.error : wrongJoin.raw);

  console.log('--- 7. User B enters room with correct password (must succeed 200) ---');
  const correctJoin = await request('POST', `/api/rooms/${code}/join`, { password: 'secretpassword' }, userB.cookie);
  console.log('User B Join:', correctJoin.status, 'ParticipantCount:', correctJoin.data ? correctJoin.data.participantCount : correctJoin.raw);

  console.log('--- 8. User B gets LiveKit video token ---');
  const tokenB = await request('GET', `/api/calls/token/room/${code}`, null, userB.cookie);
  console.log('User B Token:', tokenB.status, 'Has Token:', !!tokenB.data.token);

  console.log('--- 9. User C attempts to join (Capacity limit of 2 must reject with 409) ---');
  const userC = await request('POST', '/api/auth/dev-login', { name: 'Third Person', email: 'third@test.com' });
  const thirdJoin = await request('POST', `/api/rooms/${code}/join`, { password: 'secretpassword' }, userC.cookie);
  console.log('Third Person Join Attempt:', thirdJoin.status, thirdJoin.data ? thirdJoin.data.error : thirdJoin.raw);

  console.log('\n--- 10. Random Matchmaking Test ---');
  const matchA = await request('POST', '/api/match/start', { interests: ['coding', 'music'] }, userA.cookie);
  console.log('User A In Queue:', matchA.status, matchA.data.status);

  const matchB = await request('POST', '/api/match/start', { interests: ['coding', 'art'] }, userB.cookie);
  console.log('User B Matches with User A:', matchB.status, matchB.data.status, 'Room:', matchB.data.match ? matchB.data.match.roomName : null);
}

runTest().catch(console.error);
