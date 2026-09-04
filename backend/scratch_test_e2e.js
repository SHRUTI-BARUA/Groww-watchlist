const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runE2ETests() {
  console.log('=== STARTING END-TO-END BACKEND TEST SUITE ===\n');
  const timestamp = Date.now();
  const testEmail = `e2e_${timestamp}@example.com`;
  const testPassword = 'password123';

  // 1. Health check
  console.log('1. Testing /health...');
  const healthRes = await request({ host: 'localhost', port: 4000, path: '/health', method: 'GET' });
  console.log('Health status:', healthRes.status, healthRes.body);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Auth: Register
  console.log('\n2. Testing /api/auth/register...');
  const regRes = await request(
    { host: 'localhost', port: 4000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: testEmail, password: testPassword }
  );
  console.log('Register response:', regRes.status, regRes.body.user);
  if ((regRes.status !== 200 && regRes.status !== 201) || !regRes.body.token) throw new Error('Register failed');
  const token = regRes.body.token;

  // 3. Auth: Login
  console.log('\n3. Testing /api/auth/login...');
  const loginRes = await request(
    { host: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: testEmail, password: testPassword }
  );
  console.log('Login response:', loginRes.status, loginRes.body.user);
  if (loginRes.status !== 200) throw new Error('Login failed');

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // 4. Watchlists: List (auto-created default)
  console.log('\n4. Testing /api/watchlists (List)...');
  const listRes = await request({ host: 'localhost', port: 4000, path: '/api/watchlists', method: 'GET', headers: authHeaders });
  console.log('Watchlists:', listRes.body.watchlists);
  if (!listRes.body.watchlists || listRes.body.watchlists.length === 0) throw new Error('No default watchlist created');

  // 5. Watchlists: Create new
  console.log('\n5. Testing /api/watchlists (Create)...');
  const createWlRes = await request(
    { host: 'localhost', port: 4000, path: '/api/watchlists', method: 'POST', headers: authHeaders },
    { name: 'High Conviction Alpha' }
  );
  console.log('Created watchlist:', createWlRes.body);
  const activeWlId = createWlRes.body.id;

  // 6. Watchlists: Rename
  console.log('\n6. Testing /api/watchlists/:id (Rename)...');
  const renameRes = await request(
    { host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}`, method: 'PUT', headers: authHeaders },
    { name: 'Quant Momentum Portfolio' }
  );
  console.log('Renamed:', renameRes.body);

  // 7. Watchlists: Add items (RELIANCE, TCS, ZOMATO)
  console.log('\n7. Testing /api/watchlists/:id/items (Add RELIANCE, TCS, ZOMATO)...');
  await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/items`, method: 'POST', headers: authHeaders }, { symbol: 'RELIANCE' });
  await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/items`, method: 'POST', headers: authHeaders }, { symbol: 'TCS' });
  await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/items`, method: 'POST', headers: authHeaders }, { symbol: 'ZOMATO' });

  // 8. Watchlists: View watchlist state
  console.log('\n8. Testing /api/watchlists/:id/view...');
  const viewRes = await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/view`, method: 'GET', headers: authHeaders });
  console.log('View items count:', viewRes.body.items.length);
  viewRes.body.items.forEach(i => {
    if (i.error) {
      console.log(` - ${i.symbol}: Error=${i.error}`);
    } else {
      console.log(` - ${i.symbol}: Price=₹${i.quote?.price}, Attention=${i.attention?.score} (${i.attention?.bucket}), Reason="${i.attention?.reason}"`);
    }
  });
  if (viewRes.body.items.length !== 3) throw new Error('Expected 3 items in watchlist');

  // 9. Simulation: Shock stock
  console.log('\n9. Testing /api/market/simulate-shock on RELIANCE (+5.2%)...');
  const shockRes = await request(
    { host: 'localhost', port: 4000, path: '/api/market/simulate-shock', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { symbol: 'RELIANCE', pctMove: 5.2, volumeMultiplier: 5.0 }
  );
  console.log('Shock result:', shockRes.body);

  // 10. Verify shock reflected in view
  console.log('\n10. Verifying shock in /api/watchlists/:id/view...');
  const viewAfterShock = await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/view`, method: 'GET', headers: authHeaders });
  const rel = viewAfterShock.body.items.find(i => i.symbol === 'RELIANCE');
  console.log(`RELIANCE after shock: Price=₹${rel.quote?.price}, Score=${rel.attention?.score} (${rel.attention?.bucket})`);
  console.log('Reason:', rel.attention?.reason);

  // 11. Simulation: Broadcast news
  console.log('\n11. Testing /api/market/simulate-news on TCS...');
  const newsRes = await request(
    { host: 'localhost', port: 4000, path: '/api/market/simulate-news', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { symbol: 'TCS', headline: 'TCS signs $1.5B multi-year cloud transformation deal', tag: 'earnings' }
  );
  console.log('News result:', newsRes.body);

  // 12. Checkpoint: Mark Seen
  console.log('\n12. Testing /api/watchlists/:id/mark-seen (Mark Seen)...');
  const seenRes = await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/mark-seen`, method: 'POST', headers: authHeaders });
  console.log('Mark seen result:', seenRes.body);

  // 13. Verify Diff baseline updated
  console.log('\n13. Verifying diff baseline after Mark Seen...');
  const viewAfterSeen = await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/view`, method: 'GET', headers: authHeaders });
  viewAfterSeen.body.items.forEach(i => {
    if (!i.error) {
      console.log(` - ${i.symbol}: Baseline=₹${i.diff?.baselinePrice}, Delta=${i.diff?.priceDeltaPct}%`);
    }
  });

  // 14. Market overview & history
  console.log('\n14. Testing /api/market/overview and /api/market/history/RELIANCE...');
  const overviewRes = await request({ host: 'localhost', port: 4000, path: '/api/market/overview', method: 'GET' });
  console.log('Market Overview: Advances=', overviewRes.body.breadth?.advances, 'Declines=', overviewRes.body.breadth?.declines);
  const historyRes = await request({ host: 'localhost', port: 4000, path: '/api/market/history/RELIANCE', method: 'GET' });
  console.log('History snapshots count:', historyRes.body.snapshots?.length, 'News count:', historyRes.body.news?.length);

  // 15. Resilience / Circuit Breaker Outage test
  console.log('\n15. Testing Circuit Breaker Outage (/api/market/simulate-breaker)...');
  const outageRes = await request(
    { host: 'localhost', port: 4000, path: '/api/market/simulate-breaker', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { enable: true }
  );
  console.log('Outage response:', outageRes.body);
  const viewDuringOutage = await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/view`, method: 'GET', headers: authHeaders });
  console.log('Breaker state in view:', viewDuringOutage.body.breakerState);
  console.log('First item freshness during outage:', viewDuringOutage.body.items[0]?.quote?.freshness);

  // Restore breaker
  await request(
    { host: 'localhost', port: 4000, path: '/api/market/simulate-breaker', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { enable: false }
  );

  // 16. Cleanup: Remove item & delete watchlist
  console.log('\n16. Testing remove item and delete watchlist...');
  await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}/items/ZOMATO`, method: 'DELETE', headers: authHeaders });
  await request({ host: 'localhost', port: 4000, path: `/api/watchlists/${activeWlId}`, method: 'DELETE', headers: authHeaders });

  console.log('\n=== ALL 16 END-TO-END TESTS COMPLETED SUCCESSFULLY! ===');
}

runE2ETests().catch(err => {
  console.error('\n❌ E2E TEST SUITE FAILED:', err);
  process.exit(1);
});
