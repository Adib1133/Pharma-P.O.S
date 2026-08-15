const http = require('http');
const app = require('./src/server/server');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'object' ? JSON.stringify(postData) : postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Offline Pharmacy POS System Verification ---');

  const TEST_PORT = 4581;
  const server = app.listen(TEST_PORT, '127.0.0.1');

  try {
    // 1. Check POS SPA Endpoint
    const posRes = await request({ hostname: '127.0.0.1', port: TEST_PORT, path: '/pos/', method: 'GET' });
    console.log('✓ POS Frontend endpoint status:', posRes.status);
    if (posRes.status !== 200) throw new Error('POS endpoint failed');

    // 2. Check Admin SPA Endpoint
    const adminRes = await request({ hostname: '127.0.0.1', port: TEST_PORT, path: '/admin/', method: 'GET' });
    console.log('✓ Admin Frontend endpoint status:', adminRes.status);
    if (adminRes.status !== 200) throw new Error('Admin endpoint failed');

    // 3. Test Authentication API
    const authRes = await request({
      hostname: '127.0.0.1', port: TEST_PORT, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { pin: '5678' });
    console.log('✓ Auth PIN Login status:', authRes.status, '| User:', authRes.data.user.name, 'Role:', authRes.data.user.role);
    if (authRes.status !== 200 || !authRes.data.success) throw new Error('PIN Login failed');

    // 4. Test Medicine Search API
    const medRes = await request({ hostname: '127.0.0.1', port: TEST_PORT, path: '/api/medicines/search?q=Amoxil', method: 'GET' });
    console.log('✓ Medicine search status:', medRes.status, '| Matches found:', medRes.data.length);
    if (medRes.status !== 200 || medRes.data.length === 0) throw new Error('Medicine search failed');

    // 5. Test FEFO Batch Resolution API
    const fefoRes = await request({ hostname: '127.0.0.1', port: TEST_PORT, path: '/api/stock/fefo/1', method: 'GET' });
    console.log('✓ FEFO Batch auto-pick for Medicine #1:', fefoRes.data.recommendedBatch.batch_no, 'Expiry:', fefoRes.data.recommendedBatch.expiry_date);
    if (fefoRes.status !== 200 || !fefoRes.data.recommendedBatch) throw new Error('FEFO resolution failed');

    // 6. Test New Comprehensive Sales Report API
    const salesRepRes = await request({ hostname: '127.0.0.1', port: TEST_PORT, path: '/api/reports/sales-report?timeframe=daily', method: 'GET' });
    console.log('✓ Sales Report API status:', salesRepRes.status, '| Total Sales:', salesRepRes.data.summary.grand_total);
    if (salesRepRes.status !== 200) throw new Error('Sales report failed');

    // 7. Test Currently Stocked Valuation API
    const stockedRes = await request({ hostname: '127.0.0.1', port: TEST_PORT, path: '/api/reports/currently-stocked', method: 'GET' });
    console.log('✓ Stocked Valuation API status:', stockedRes.status, '| Total Items:', stockedRes.data.summary.stocked_items);
    if (stockedRes.status !== 200) throw new Error('Stocked valuation report failed');

    // 8. Test Dashboard KPIs API
    const kpiRes = await request({ hostname: '127.0.0.1', port: TEST_PORT, path: '/api/reports/dashboard-kpis', method: 'GET' });
    console.log('✓ Dashboard KPIs status:', kpiRes.status, '| Today Revenue:', kpiRes.data.today_revenue, '| Month Revenue:', kpiRes.data.month_revenue);

    console.log('\n==================================================');
    console.log(' ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ');
    console.log('==================================================');
  } catch (err) {
    console.error('❌ Verification Test Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
