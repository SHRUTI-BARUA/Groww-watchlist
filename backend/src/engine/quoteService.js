// quoteService.js
// The single place that knows how to get "the current best-known quote" for
// a symbol, handling exactly the failure modes called out in design doc
// §2.4: provider timeouts/errors, staleness, and market-hours awareness.
//
// Flow: try the primary provider (Groww Live) through its circuit breaker -> on success,
// cache it and mark 'live' -> on failure (or open breaker), serve the last
// cached value and mark it 'delayed' -> if nothing cached either, fallback
// to base universe quote marked 'delayed'.

const provider = process.env.DATA_PROVIDER === 'mock'
  ? require('../marketData/mockProvider')
  : require('../marketData/growwProvider');
const cache = require('../cache');
const { CircuitBreaker } = require('../resilience/circuitBreaker');
const { BY_SYMBOL } = require('../marketData/universe');

const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 5000 });
const CACHE_TTL_MS = 8000;

function isMarketOpenNow() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs - now.getTimezoneOffset() * 60000);
  const day = ist.getUTCDay();
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const isTradingWindow = minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;
  return isWeekday && isTradingWindow;
}

async function getQuoteWithFreshness(symbol) {
  const cacheKey = `quote:${symbol}`;

  if (breaker.canAttempt()) {
    try {
      const quote = await provider.getQuote(symbol);
      breaker.onSuccess();
      cache.set(cacheKey, quote, CACHE_TTL_MS);
      return { ...quote, freshness: 'live', marketOpen: isMarketOpenNow() };
    } catch (err) {
      breaker.onFailure();
      // fall through to fallback cache below
    }
  }

  // Graceful degradation: serve cached or last-known-good price
  const cached = cache.get(cacheKey) || cache.getStale(cacheKey);
  if (cached) {
    return { ...cached, freshness: 'delayed', marketOpen: isMarketOpenNow() };
  }

  // Cold-boot fallback to base universe seed
  const baseMeta = BY_SYMBOL[symbol];
  if (baseMeta) {
    const baseQuote = {
      symbol,
      price: baseMeta.basePrice,
      volume: baseMeta.baseVolume,
      dayOpen: baseMeta.basePrice,
      prevClose: baseMeta.basePrice,
      dayHigh: baseMeta.basePrice,
      dayLow: baseMeta.basePrice,
      high52w: +(baseMeta.basePrice * 1.25).toFixed(2),
      low52w: +(baseMeta.basePrice * 0.75).toFixed(2),
      upperCircuit: +(baseMeta.basePrice * 1.10).toFixed(2),
      lowerCircuit: +(baseMeta.basePrice * 0.90).toFixed(2),
      avgVolume20d: baseMeta.baseVolume,
      volatility20dPct: baseMeta.baseVolPct,
      freshness: 'delayed',
      marketOpen: isMarketOpenNow(),
      ts: Date.now(),
    };
    cache.set(cacheKey, baseQuote, CACHE_TTL_MS);
    return baseQuote;
  }

  throw new Error(`No data available for ${symbol}`);
}

async function getQuotesWithFreshness(symbols) {
  const results = await Promise.all(
    symbols.map(async (sym) => {
      try {
        return [sym, await getQuoteWithFreshness(sym)];
      } catch (err) {
        return [sym, { symbol: sym, error: err.message }];
      }
    })
  );
  return new Map(results);
}

function getBreakerState() {
  return breaker.getState();
}

module.exports = { getQuoteWithFreshness, getQuotesWithFreshness, isMarketOpenNow, getBreakerState };
