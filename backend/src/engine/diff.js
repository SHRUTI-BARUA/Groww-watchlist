// diff.js
// Computes "what changed since last visit" for a ticker — the actual
// product mechanic (design doc §1, §2.2), distinct from "today's change"
// which every other watchlist already shows.
//
// Baseline = the most recent snapshot at or before the user's last_viewed_at
// (or, if the user has never viewed, the earliest available snapshot for
// that symbol — a first-time view has nothing to diff against, which the UI
// represents honestly rather than fabricating a baseline).

const db = require('../db');
const { getNewsSince, getCorpActionsSince } = require('../marketData/newsGenerator');

const getBaselineSnapshot = db.prepare(`
  SELECT * FROM snapshots
  WHERE symbol = ? AND ts <= ?
  ORDER BY ts DESC LIMIT 1
`);

const getEarliestSnapshot = db.prepare(`
  SELECT * FROM snapshots WHERE symbol = ? ORDER BY ts ASC LIMIT 1
`);

function buildDiff(symbol, currentQuote, currentAttention, sinceTs) {
  let baseline = sinceTs ? getBaselineSnapshot.get(symbol, sinceTs) : null;
  let isFirstView = false;
  if (!baseline) {
    baseline = getEarliestSnapshot.get(symbol);
    isFirstView = true;
  }

  const news = sinceTs ? getNewsSince(symbol, sinceTs, 3) : [];
  const corpActions = sinceTs ? getCorpActionsSince(symbol, sinceTs) : [];

  if (!baseline) {
    // No history at all yet for this symbol (e.g. app just started).
    return {
      symbol,
      hasBaseline: false,
      isFirstView: true,
      priceDelta: null,
      priceDeltaPct: null,
      scoreDelta: null,
      news,
      corpActions,
    };
  }

  const priceDelta = +(currentQuote.price - baseline.price).toFixed(2);
  const priceDeltaPct = +(((currentQuote.price - baseline.price) / baseline.price) * 100).toFixed(2);
  const scoreDelta = currentAttention.score - baseline.attention_score;

  return {
    symbol,
    hasBaseline: true,
    isFirstView,
    baselineTs: baseline.ts,
    baselinePrice: baseline.price,
    priceDelta,
    priceDeltaPct,
    scoreDelta,
    news,
    corpActions,
  };
}

module.exports = { buildDiff };
