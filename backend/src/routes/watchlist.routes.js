const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { authMiddleware } = require('../auth');
const { getQuotesWithFreshness, getBreakerState } = require('../engine/quoteService');
const { computeAttentionScore } = require('../engine/attentionScore');
const { buildDiff } = require('../engine/diff');
const { computeWatchlistSummary } = require('../engine/summary');
const { detectClusters } = require('../engine/clustering');
const { SYMBOLS, BY_SYMBOL } = require('../marketData/universe');

const router = express.Router();
router.use(authMiddleware);

const insertWatchlist = db.prepare('INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)');
const updateWatchlist = db.prepare('UPDATE watchlists SET name = ? WHERE id = ? AND user_id = ?');
const listWatchlists = db.prepare('SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at ASC');
const getWatchlist = db.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?');
const deleteWatchlist = db.prepare('DELETE FROM watchlists WHERE id = ? AND user_id = ?');

const listItems = db.prepare('SELECT * FROM watchlist_items WHERE watchlist_id = ? ORDER BY added_at ASC');
const insertItem = db.prepare('INSERT OR IGNORE INTO watchlist_items (id, watchlist_id, symbol, added_at) VALUES (?, ?, ?, ?)');
const deleteItem = db.prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?');

const getLastViewed = db.prepare('SELECT viewed_at FROM last_viewed WHERE user_id = ? AND watchlist_id = ?');
const upsertLastViewed = db.prepare(`
  INSERT INTO last_viewed (user_id, watchlist_id, viewed_at) VALUES (?, ?, ?)
  ON CONFLICT(user_id, watchlist_id) DO UPDATE SET viewed_at = excluded.viewed_at
`);

function ownedWatchlistOr404(req, res) {
  const wl = getWatchlist.get(req.params.id, req.userId);
  if (!wl) {
    res.status(404).json({ error: 'watchlist not found' });
    return null;
  }
  return wl;
}

// --- Watchlist management ---

router.get('/', (req, res) => {
  const wls = listWatchlists.all(req.userId);
  res.json({ watchlists: wls });
});

router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  const id = nanoid();
  insertWatchlist.run(id, req.userId, name.trim(), Date.now());
  res.status(201).json({ id, name: name.trim() });
});

router.put('/:id', (req, res) => {
  const wl = ownedWatchlistOr404(req, res);
  if (!wl) return;
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  updateWatchlist.run(name.trim(), req.params.id, req.userId);
  res.json({ id: req.params.id, name: name.trim() });
});

router.delete('/:id', (req, res) => {
  const wl = ownedWatchlistOr404(req, res);
  if (!wl) return;
  deleteWatchlist.run(req.params.id, req.userId);
  res.status(204).end();
});

// --- Items ---

router.post('/:id/items', (req, res) => {
  const wl = ownedWatchlistOr404(req, res);
  if (!wl) return;
  const { symbol } = req.body || {};
  const sym = (symbol || '').toUpperCase().trim();
  if (!BY_SYMBOL[sym]) {
    return res.status(400).json({ error: `unknown symbol '${sym}'`, availableSymbols: SYMBOLS });
  }
  insertItem.run(nanoid(), wl.id, sym, Date.now());
  res.status(201).json({ symbol: sym });
});

router.delete('/:id/items/:symbol', (req, res) => {
  const wl = ownedWatchlistOr404(req, res);
  if (!wl) return;
  deleteItem.run(wl.id, req.params.symbol.toUpperCase());
  res.status(204).end();
});

// --- The core view: current state + what changed since last visit ---

router.get('/:id/view', async (req, res) => {
  const wl = ownedWatchlistOr404(req, res);
  if (!wl) return;

  const items = listItems.all(wl.id);
  const symbols = items.map((i) => i.symbol);

  if (symbols.length === 0) {
    return res.json({
      watchlist: wl,
      summary: null,
      clusters: [],
      items: [],
      breakerState: getBreakerState(),
    });
  }

  const lastViewedRow = getLastViewed.get(req.userId, wl.id);
  const sinceTs = lastViewedRow ? lastViewedRow.viewed_at : null;

  const quotes = await getQuotesWithFreshness(symbols);

  const result = symbols.map((symbol) => {
    const quote = quotes.get(symbol);
    if (!quote || quote.error) {
      return { symbol, error: quote?.error || 'no data available', meta: BY_SYMBOL[symbol] };
    }
    const attention = computeAttentionScore(quote);
    const diff = buildDiff(symbol, quote, attention, sinceTs);
    return {
      symbol,
      meta: BY_SYMBOL[symbol],
      quote: {
        price: quote.price,
        volume: quote.volume,
        dayOpen: quote.dayOpen,
        prevClose: quote.prevClose,
        dayHigh: quote.dayHigh,
        dayLow: quote.dayLow,
        high52w: quote.high52w,
        low52w: quote.low52w,
        upperCircuit: quote.upperCircuit,
        lowerCircuit: quote.lowerCircuit,
        avgVolume20d: quote.avgVolume20d,
        volatility20dPct: quote.volatility20dPct,
        freshness: quote.freshness,
        marketOpen: quote.marketOpen,
        ts: quote.ts,
      },
      attention,
      diff,
    };
  });

  // Sort so the most attention-worthy tickers surface first
  result.sort((a, b) => (b.attention?.score || 0) - (a.attention?.score || 0));

  // Feature 2: Detect correlated-move clusters
  const { clusters, items: clusteredResult } = detectClusters(result);

  // Feature 1: Compute Quiet Confirmation summary over the list
  const summary = computeWatchlistSummary(clusteredResult, sinceTs);

  res.json({
    watchlist: wl,
    summary,
    clusters,
    lastViewedAt: sinceTs,
    items: clusteredResult,
    breakerState: getBreakerState(),
  });
});

// Explicit "mark as seen" — the ONLY thing allowed to advance last_viewed_at.
router.post('/:id/mark-seen', (req, res) => {
  const wl = ownedWatchlistOr404(req, res);
  if (!wl) return;
  upsertLastViewed.run(req.userId, wl.id, Date.now());
  res.json({ ok: true, viewedAt: Date.now() });
});

module.exports = router;
