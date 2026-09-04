const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

function fetchHttps(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function test() {
  try {
    const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ZOMATO'];
    for (const sym of symbols) {
      const res = await fetchHttps(`https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/${sym}/latest`);
      console.log(`✅ [${sym}] Status: ${res.status}`, {
        ltp: res.body?.ltp,
        close: res.body?.close,
        volume: res.body?.volume,
        dayChangePerc: res.body?.dayChangePerc,
        yearHighPrice: res.body?.yearHighPrice,
        yearLowPrice: res.body?.yearLowPrice
      });
    }
  } catch (err) {
    console.error('HTTPS Error:', err);
  }
}

test();
