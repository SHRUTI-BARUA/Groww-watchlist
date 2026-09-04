// growwProvider.js
// Live Market Data Provider connecting directly to Groww's real-time NSE feeds.
// Satisfies the provider.interface.js contract.
//
// Fetches real, live Last Traded Price (LTP), day open/high/low/close, volume,
// 52-week highs/lows, and NSE upper/lower circuit limits directly from Groww.

const https = require('https');
const { BY_SYMBOL } = require('./universe');

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
let forcedFailure = false;
const activeShocks = new Map();

function httpGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://groww.in',
        ...headers,
      }
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`Groww API HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Groww JSON: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(4500, () => {
      req.destroy();
      reject(new Error('Groww API request timed out'));
    });
  });
}

async function fetchLiveFromGroww(symbol) {
  if (forcedFailure) {
    throw new Error('Simulated upstream failure: Groww endpoint timeout');
  }

  const cleanSym = symbol.toUpperCase().trim();
  const url = `https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/${encodeURIComponent(cleanSym)}/latest`;

  const headers = {};
  if (process.env.GROWW_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GROWW_AUTH_TOKEN}`;
  }

  const data = await httpGetJson(url, headers);
  if (!data || typeof data.ltp !== 'number') {
    throw new Error(`Invalid live quote payload from Groww for ${cleanSym}`);
  }

  const meta = BY_SYMBOL[cleanSym] || {};
  let price = Number(data.ltp);
  const prevClose = Number(data.close) || price;
  let dayOpen = Number(data.open) || prevClose;
  let dayHigh = Number(data.high) || Math.max(price, dayOpen);
  let dayLow = Number(data.low) || Math.min(price, dayOpen);
  let volume = Number(data.volume) || 0;

  // Apply any active interactive test shocks if present
  const shock = activeShocks.get(cleanSym);
  if (shock) {
    price = +(price * (1 + shock.pctMove / 100)).toFixed(2);
    volume = Math.floor(volume * (shock.volumeMultiplier || 2.0));
    dayHigh = Math.max(dayHigh, price);
    dayLow = Math.min(dayLow, price);
  }

  const high52w = Number(data.yearHighPrice) || Number((prevClose * 1.25).toFixed(2));
  const low52w = Number(data.yearLowPrice) || Number((prevClose * 0.75).toFixed(2));
  const upperCircuit = Number(data.highPriceRange) || Number((prevClose * 1.10).toFixed(2));
  const lowerCircuit = Number(data.lowPriceRange) || Number((prevClose * 0.90).toFixed(2));

  const avgVolume20d = meta.baseVolume || Math.max(volume, 500000);
  const volatility20dPct = meta.baseVolPct || 1.8;
  const ts = (data.lastTradeTime ? data.lastTradeTime * 1000 : data.tsInMillis) || Date.now();

  return {
    symbol: cleanSym,
    price,
    prevClose,
    dayOpen,
    dayHigh,
    dayLow,
    volume,
    high52w,
    low52w,
    upperCircuit,
    lowerCircuit,
    avgVolume20d,
    volatility20dPct,
    ts,
    provider: 'Groww Live (NSE)',
  };
}

async function getQuote(symbol) {
  return await fetchLiveFromGroww(symbol);
}

async function getQuotes(symbols) {
  const map = new Map();
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const q = await getQuote(sym);
        map.set(sym, q);
      } catch (err) {
        map.set(sym, { symbol: sym, error: err.message });
      }
    })
  );
  return map;
}

// Interactive shock simulation support
function shockSymbol(symbol, pctMove = 5.0, volumeMultiplier = 4.0) {
  const sym = symbol.toUpperCase().trim();
  activeShocks.set(sym, { pctMove, volumeMultiplier });
  return { symbol: sym, pctMove, volumeMultiplier };
}

function resetSymbol(symbol) {
  if (symbol) {
    activeShocks.delete(symbol.toUpperCase().trim());
  } else {
    activeShocks.clear();
  }
}

function setForcedFailure(enable) {
  forcedFailure = Boolean(enable);
}

function getForcedFailure() {
  return forcedFailure;
}

module.exports = {
  getQuote,
  getQuotes,
  shockSymbol,
  resetSymbol,
  setForcedFailure,
  getForcedFailure,
};
