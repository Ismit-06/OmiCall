const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: body ? tryParse(body) : null,
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

function tryParse(str) {
  try { return JSON.parse(str); } catch { return str; }
}

async function runTest() {
  console.log('=== 1. Login Alice ===');
  const aliceLogin = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/dev-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'alice@love.com', name: 'Alice' });
  const aliceCookie = aliceLogin.headers['set-cookie']?.[0]?.split(';')[0];
  const aliceId = aliceLogin.data?.user?.id;
  console.log('Alice cookie:', aliceCookie, 'User:', aliceLogin.data?.user?.email, 'ID:', aliceId);

  console.log('\n=== 2. Login Bob ===');
  const bobLogin = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/dev-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'bob@love.com', name: 'Bob' });
  const bobCookie = bobLogin.headers['set-cookie']?.[0]?.split(';')[0];
  const bobId = bobLogin.data?.user?.id;
  console.log('Bob cookie:', bobCookie, 'User:', bobLogin.data?.user?.email, 'ID:', bobId);

  console.log('\n=== 3. Alice Enters Matching Queue ===');
  const aliceStart = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/match/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': aliceCookie
    }
  }, { interests: ['music', 'movies'], language: 'English' });
  console.log('Alice Start Result:', aliceStart.data);

  console.log('\n=== 4. Bob Enters Matching Queue ===');
  const bobStart = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/match/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': bobCookie
    }
  }, { interests: ['movies', 'coding'], language: 'English' });
  console.log('Bob Start Result:', bobStart.data);

  console.log('\n=== 5. Alice Polls Match Status ===');
  const aliceStatus = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/match/status',
    method: 'GET',
    headers: { 'Cookie': aliceCookie }
  });
  console.log('Alice Match Status:', aliceStatus.data);

  console.log('\n=== 6. Alice Reports Bob ===');
  const matchId = bobStart.data?.match?.matchId;
  const reportRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/reports',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': aliceCookie
    }
  }, { reportedUserId: bobId, matchId: matchId, reason: 'Inappropriate behavior' });
  console.log('Report Res:', reportRes.data);

  console.log('\n=== 7. Admin Checks Dashboard & Pending Reports ===');
  const adminLogin = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/dev-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@love.com', name: 'PlatformAdmin', role: 'admin' });
  const adminCookie = adminLogin.headers['set-cookie']?.[0]?.split(';')[0];
  console.log('Admin cookie:', adminCookie, 'Role:', adminLogin.data?.user?.role);

  const dashRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/dashboard',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  console.log('Dashboard Stats:', dashRes.data);

  const reportsRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/reports?status=PENDING',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  console.log('Pending Reports count:', reportsRes.data?.length, reportsRes.data);

  console.log('\n=== 8. Admin Suspends Bob ===');
  const suspendRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/admin/users/${bobId}/status`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': adminCookie
    }
  }, { status: 'SUSPENDED', reason: 'Confirmed harassment report' });
  console.log('Suspend Result:', suspendRes.data);

  console.log('\n=== 9. Bob Attempts to Re-Enter Queue while Suspended ===');
  const bobTryAgain = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/match/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': bobCookie
    }
  }, { interests: ['music'] });
  console.log('Bob Status Code:', bobTryAgain.status, bobTryAgain.data);

  console.log('\n=== 10. Test Blocking: Charlie Blocks Dave ===');
  const charlieLogin = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/dev-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'charlie@love.com', name: 'Charlie' });
  const charlieCookie = charlieLogin.headers['set-cookie']?.[0]?.split(';')[0];
  const charlieId = charlieLogin.data.user.id;

  const daveLogin = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/dev-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'dave@love.com', name: 'Dave' });
  const daveCookie = daveLogin.headers['set-cookie']?.[0]?.split(';')[0];
  const daveId = daveLogin.data.user.id;

  console.log('Charlie ID:', charlieId, 'Dave ID:', daveId);

  // Charlie blocks Dave
  const blockRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/blocks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': charlieCookie
    }
  }, { blockedUserId: daveId });
  console.log('Charlie blocked Dave:', blockRes.data);

  // Charlie enters queue
  const cQueue = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/match/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': charlieCookie
    }
  }, { interests: ['art'] });
  console.log('Charlie queue status:', cQueue.data?.status);

  // Dave enters queue - MUST NOT match with Charlie because of block!
  const dQueue = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/match/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': daveCookie
    }
  }, { interests: ['art'] });
  console.log('Dave queue status (should be SEARCHING, NOT MATCHED):', dQueue.data?.status, 'queueSize:', dQueue.data?.queueSize);

  console.log('\n=== ALL MATCHING, SAFETY & BLOCKING TESTS COMPLETE ===');
}

runTest().catch(console.error);
