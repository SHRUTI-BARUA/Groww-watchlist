// newsGenerator.js
// Generates headlines/corporate actions correlated with "event ticks" from
// the mock provider, so the attention engine has real explanatory context to
// attach to a move (see design doc §2.1 — the reason is the product, not the
// score). A real system would replace this with an actual news API + a
// lightweight relevance/dedup pass; this simulates that output shape.

const db = require('../db');

const HEADLINE_TEMPLATES = {
  earnings: [
    (s) => `${s} beats street estimates on quarterly earnings`,
    (s) => `${s} misses profit estimates, margins under pressure`,
    (s) => `${s} Q results: revenue growth ahead of consensus`,
  ],
  general: [
    (s) => `Brokerage upgrades ${s} to 'Buy', raises target price`,
    (s) => `Brokerage downgrades ${s} citing sector headwinds`,
    (s) => `${s} announces new capacity expansion`,
    (s) => `Block deal reported in ${s}, large investor exits stake`,
    (s) => `${s} in focus after sector-wide rally`,
    (s) => `Regulatory filing flags related-party transaction at ${s}`,
  ],
  'corp-action': [
    (s) => `${s} board approves interim dividend`,
    (s) => `${s} announces 1:1 bonus issue`,
    (s) => `${s} stock split announced, record date set`,
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const insertNews = db.prepare(
  `INSERT INTO news_events (symbol, ts, headline, tag) VALUES (?, ?, ?, ?)`
);
const insertCorpAction = db.prepare(
  `INSERT INTO corporate_actions (symbol, ts, type, detail) VALUES (?, ?, ?, ?)`
);

// Called by the poller when a symbol produces an "event tick" — correlates a
// headline with the move roughly 70% of the time (the other 30% simulates
// moves that genuinely have no clean explanation, which is realistic and
// also an important case for the UI to represent honestly rather than
// inventing a cause).
function maybeGenerateNews(symbol) {
  if (Math.random() > 0.7) return null;

  const isCorpAction = Math.random() < 0.15;
  const isEarnings = !isCorpAction && Math.random() < 0.4;
  const tag = isCorpAction ? 'corp-action' : isEarnings ? 'earnings' : 'general';
  const template = pick(HEADLINE_TEMPLATES[tag]);
  const headline = template(symbol);
  const ts = Date.now();

  insertNews.run(symbol, ts, headline, tag);

  if (isCorpAction) {
    const type = pick(['dividend', 'split', 'bonus']);
    insertCorpAction.run(symbol, ts, type, headline);
  }

  return { symbol, ts, headline, tag };
}

function getNewsSince(symbol, sinceTs, limit = 3) {
  return db
    .prepare(
      `SELECT symbol, ts, headline, tag FROM news_events
       WHERE symbol = ? AND ts >= ? ORDER BY ts DESC LIMIT ?`
    )
    .all(symbol, sinceTs, limit);
}

function getLatestNews(symbol, limit = 2) {
  return db
    .prepare(
      `SELECT symbol, ts, headline, tag FROM news_events
       WHERE symbol = ? ORDER BY ts DESC LIMIT ?`
    )
    .all(symbol, limit);
}

function getCorpActionsSince(symbol, sinceTs) {
  return db
    .prepare(
      `SELECT symbol, ts, type, detail FROM corporate_actions
       WHERE symbol = ? AND ts >= ? ORDER BY ts DESC`
    )
    .all(symbol, sinceTs);
}

function injectNews(symbol, customHeadline, customTag = 'earnings') {
  const headline = customHeadline || pick(HEADLINE_TEMPLATES[customTag] || HEADLINE_TEMPLATES.general)(symbol);
  const tag = customTag;
  const ts = Date.now();

  insertNews.run(symbol, ts, headline, tag);

  if (tag === 'corp-action') {
    const type = pick(['dividend', 'split', 'bonus']);
    insertCorpAction.run(symbol, ts, type, headline);
  }

  return { symbol, ts, headline, tag };
}

function getAllNews(symbol, limit = 20) {
  return db
    .prepare(
      `SELECT symbol, ts, headline, tag FROM news_events
       WHERE symbol = ? ORDER BY ts DESC LIMIT ?`
    )
    .all(symbol, limit);
}

function getAllCorpActions(symbol, limit = 10) {
  return db
    .prepare(
      `SELECT symbol, ts, type, detail FROM corporate_actions
       WHERE symbol = ? ORDER BY ts DESC LIMIT ?`
    )
    .all(symbol, limit);
}

module.exports = { 
  maybeGenerateNews, 
  getNewsSince, 
  getLatestNews, 
  getCorpActionsSince, 
  injectNews, 
  getAllNews, 
  getAllCorpActions 
};
