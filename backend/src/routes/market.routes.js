const express = require('express');
const db = require('../db');
const { UNIVERSE, BY_SYMBOL, SYMBOLS } = require('../marketData/universe');
const activeProvider = process.env.DATA_PROVIDER === 'mock'
  ? require('../marketData/mockProvider')
  : require('../marketData/growwProvider');
const { getQuotesWithFreshness, getBreakerState, isMarketOpenNow } = require('../engine/quoteService');
const { injectNews, getAllNews, getAllCorpActions } = require('../marketData/newsGenerator');
const poller = require('../worker/poller');

const router = express.Router();

const getSnapshotsBySymbol = db.prepare(`
  SELECT symbol, ts, price, volume, day_open, prev_close, day_high, day_low, attention_score, attention_reason, freshness
  FROM snapshots
  WHERE symbol = ?
  ORDER BY ts ASC
  LIMIT 100
`);

// Public — browsing the tradeable universe doesn't require auth
router.get('/universe', (req, res) => {
  const q = (req.query.q || '').toUpperCase().trim();
  const results = q
    ? UNIVERSE.filter((u) => u.symbol.includes(q) || u.name.toUpperCase().includes(q))
    : UNIVERSE;
  res.json({ results });
});

// Market Overview & Breadth Stats
router.get('/overview', async (req, res) => {
  try {
    const quotes = await getQuotesWithFreshness(SYMBOLS);
    let advances = 0;
    let declines = 0;
    let unchanged = 0;
    const summaryList = [];

    for (const sym of SYMBOLS) {
      const q = quotes.get(sym);
      if (q && !q.error) {
        const changePct = ((q.price - q.prevClose) / q.prevClose) * 100;
        if (changePct > 0.05) advances++;
        else if (changePct < -0.05) declines++;
        else unchanged++;
        summaryList.push({
          symbol: sym,
          name: BY_SYMBOL[sym]?.name,
          sector: BY_SYMBOL[sym]?.sector,
          price: q.price,
          changePct: +changePct.toFixed(2),
          volume: q.volume,
        });
      }
    }

    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffsetMs - now.getTimezoneOffset() * 60000);

    res.json({
      marketOpen: isMarketOpenNow(),
      istTime: ist.toISOString(),
      provider: 'Groww Live Feed (NSE)',
      totalTracked: SYMBOLS.length,
      advances,
      declines,
      unchanged,
      summary: summaryList,
      forcedFailure: activeProvider.getForcedFailure(),
      breakerState: getBreakerState(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single Ticker Historical Snapshots & News
router.get('/history/:symbol', async (req, res) => {
  const sym = (req.params.symbol || '').toUpperCase().trim();
  if (!BY_SYMBOL[sym]) {
    return res.status(404).json({ error: `unknown symbol ${sym}` });
  }

  const snapshots = getSnapshotsBySymbol.all(sym).map((s) => ({
    ...s,
    price: Number(s.price),
    attention_score: Number(s.attention_score),
  }));

  const news = getAllNews(sym);
  const corpActions = getAllCorpActions(sym);

  res.json({
    symbol: sym,
    name: BY_SYMBOL[sym]?.name,
    sector: BY_SYMBOL[sym]?.sector,
    snapshots,
    news,
    corpActions,
  });
});

// Simulation: Inject sudden price shock and volume surge
router.post('/simulate-shock', async (req, res) => {
  const { symbol, pctMove = 5.0, volumeMultiplier = 5.0 } = req.body || {};
  const sym = (symbol || 'RELIANCE').toUpperCase().trim();
  if (!BY_SYMBOL[sym]) {
    return res.status(400).json({ error: `unknown symbol ${sym}` });
  }

  try {
    const updatedQuote = activeProvider.shockSymbol(sym, Number(pctMove), Number(volumeMultiplier));
    // Trigger immediate poller tick so WebSocket broadcasts and snapshot is saved
    await poller.pollOnce();
    res.json({ ok: true, symbol: sym, quote: updatedQuote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulation: Inject custom news headline or corporate action
router.post('/simulate-news', async (req, res) => {
  const { symbol, headline, tag = 'earnings' } = req.body || {};
  const sym = (symbol || 'RELIANCE').toUpperCase().trim();
  if (!BY_SYMBOL[sym]) {
    return res.status(400).json({ error: `unknown symbol ${sym}` });
  }

  try {
    const event = injectNews(sym, headline, tag);
    // Also shock slightly so attention triggers
    activeProvider.shockSymbol(sym, tag === 'earnings' ? 3.2 : 1.8, 2.5);
    await poller.pollOnce();
    res.json({ ok: true, event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulation: Toggle forced circuit breaker failure
router.post('/simulate-breaker', (req, res) => {
  const { enable } = req.body || {};
  activeProvider.setForcedFailure(enable);
  res.json({ ok: true, forcedFailure: activeProvider.getForcedFailure(), breakerState: getBreakerState() });
});

// Simulation: Reset market prices to base universe
router.post('/simulate-reset', async (req, res) => {
  const { symbol } = req.body || {};
  activeProvider.resetSymbol(symbol ? symbol.toUpperCase().trim() : null);
  await poller.pollOnce();
  res.json({ ok: true });
});

module.exports = router;
