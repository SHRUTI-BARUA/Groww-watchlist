// poller.js
// The scaling answer from design doc §2.5: poll each DISTINCT ticker that
// any user is watching exactly once per interval, regardless of how many
// users are watching it. 10,000 users watching RELIANCE costs the same as
// 1 user watching it. This is the seam that makes the system's cost scale
// with "distinct tickers on the platform," not "number of users."
//
// Each tick: compute the union of watched symbols from the DB, fetch quotes
// for that union (via quoteService, which handles retries/fallback/cache),
// score each one, persist a snapshot, and broadcast the update to any
// connected WebSocket clients watching that symbol.

const db = require('../db');
const { getQuotesWithFreshness } = require('../engine/quoteService');
const { computeAttentionScore } = require('../engine/attentionScore');

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 4000);

const insertSnapshot = db.prepare(`
  INSERT INTO snapshots
    (symbol, ts, price, volume, day_open, prev_close, day_high, day_low, attention_score, attention_reason, freshness)
  VALUES (@symbol, @ts, @price, @volume, @day_open, @prev_close, @day_high, @day_low, @attention_score, @attention_reason, @freshness)
`);

const getWatchedSymbols = db.prepare(`
  SELECT DISTINCT symbol FROM watchlist_items
`);

function unionOfWatchedSymbols() {
  return getWatchedSymbols.all().map((r) => r.symbol);
}

let broadcastFn = () => {};
function setBroadcaster(fn) {
  broadcastFn = fn;
}

async function pollOnce() {
  const symbols = unionOfWatchedSymbols();
  if (symbols.length === 0) return { polled: 0 };

  const quotes = await getQuotesWithFreshness(symbols);
  const ts = Date.now();
  let polled = 0;

  for (const symbol of symbols) {
    const quote = quotes.get(symbol);
    if (!quote || quote.error) continue; // no data at all this cycle — skip, don't fabricate

    const attention = computeAttentionScore(quote);

    insertSnapshot.run({
      symbol,
      ts,
      price: quote.price,
      volume: quote.volume,
      day_open: quote.dayOpen,
      prev_close: quote.prevClose,
      day_high: quote.dayHigh,
      day_low: quote.dayLow,
      attention_score: attention.score,
      attention_reason: attention.reason,
      freshness: quote.freshness,
    });

    polled += 1;
    broadcastFn(symbol, {
      symbol,
      price: quote.price,
      volume: quote.volume,
      freshness: quote.freshness,
      marketOpen: quote.marketOpen,
      attentionScore: attention.score,
      attentionBucket: attention.bucket,
      attentionReason: attention.reason,
      ts,
    });
  }

  return { polled };
}

let timer = null;
function start() {
  if (timer) return;
  timer = setInterval(() => {
    pollOnce().catch((err) => console.error('[poller] cycle error:', err.message));
  }, POLL_INTERVAL_MS);
  // Run one immediately so the app has data on startup instead of waiting
  // a full interval.
  pollOnce().catch((err) => console.error('[poller] initial cycle error:', err.message));
}

function stop() {
  clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, pollOnce, setBroadcaster, unionOfWatchedSymbols };
