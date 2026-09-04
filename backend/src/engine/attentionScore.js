// attentionScore.js
// The core of the whole product (design doc §2.1). Turns a raw quote into a
// 0-100 Attention Score plus a one-line human-readable reason. Deliberately
// NOT a single-threshold rule ("alert if |change| > 2%") — that's the
// "obvious watchlist" the brief explicitly says not to build.
//
// Composed of independent signals, each cheap to compute from data the mock
// provider (or a real one) already exposes:
//   - volatility-adjusted move (z-score against the symbol's own baseline)
//   - volume anomaly (today's volume vs. 20d average, prorated for time of day)
//   - 52-week high/low breach
//   - gap-open magnitude
//   - circuit proximity (NSE/BSE-specific — distance to upper/lower circuit)
//   - corroborating news / corporate action / earnings proximity
//
// Each signal contributes points; the reason string is built from whichever
// signals actually fired, in order of contribution, so the explanation is
// never generic.

const { maybeGenerateNews, getLatestNews, getCorpActionsSince } = require('../marketData/newsGenerator');

const MARKET_OPEN_MINUTES = 375; // NSE: 9:15 to 15:30

function minutesSinceOpenEstimate() {
  // Simulation convenience: treat "session progress" as a soft multiplier so
  // volume-anomaly comparisons don't unfairly flag early-session low volume
  // as anomalous. In a real system this would use actual market-session
  // clock time; kept simple here since the mock market runs continuously.
  return Math.min(MARKET_OPEN_MINUTES, 90 + Math.random() * 200);
}

function scoreVolatilityMove(quote) {
  const movePct = ((quote.price - quote.prevClose) / quote.prevClose) * 100;
  const z = quote.volatility20dPct > 0 ? movePct / quote.volatility20dPct : 0;
  const absZ = Math.abs(z);
  let points = 0;
  if (absZ >= 3) points = 35;
  else if (absZ >= 2) points = 25;
  else if (absZ >= 1) points = 12;
  else points = Math.round(absZ * 5);
  return { points, movePct, z };
}

function scoreVolumeAnomaly(quote) {
  const sessionProgress = minutesSinceOpenEstimate() / MARKET_OPEN_MINUTES;
  const expectedVolumeSoFar = quote.avgVolume20d * sessionProgress;
  const ratio = expectedVolumeSoFar > 0 ? quote.volume / expectedVolumeSoFar : 1;
  let points = 0;
  if (ratio >= 4) points = 25;
  else if (ratio >= 2) points = 15;
  else if (ratio >= 1.5) points = 8;
  return { points, ratio };
}

function score52wBreach(quote) {
  if (quote.price >= quote.high52w) return { points: 15, type: 'high' };
  if (quote.price <= quote.low52w) return { points: 15, type: 'low' };
  const distToHighPct = ((quote.high52w - quote.price) / quote.price) * 100;
  const distToLowPct = ((quote.price - quote.low52w) / quote.price) * 100;
  if (distToHighPct <= 1) return { points: 6, type: 'near-high' };
  if (distToLowPct <= 1) return { points: 6, type: 'near-low' };
  return { points: 0, type: null };
}

function scoreGapOpen(quote) {
  const gapPct = ((quote.dayOpen - quote.prevClose) / quote.prevClose) * 100;
  const normalGap = quote.volatility20dPct * 0.5;
  const points = Math.abs(gapPct) > normalGap * 1.5 ? 10 : 0;
  return { points, gapPct };
}

function scoreCircuitProximity(quote) {
  const distToUpperPct = ((quote.upperCircuit - quote.price) / quote.price) * 100;
  const distToLowerPct = ((quote.price - quote.lowerCircuit) / quote.price) * 100;
  if (quote.price >= quote.upperCircuit) return { points: 20, type: 'upper-hit' };
  if (quote.price <= quote.lowerCircuit) return { points: 20, type: 'lower-hit' };
  if (distToUpperPct <= 2) return { points: 12, type: 'near-upper' };
  if (distToLowerPct <= 2) return { points: 12, type: 'near-lower' };
  return { points: 0, type: null };
}

function computeAttentionScore(quote) {
  // Occasionally generate a correlated news/corp-action event for this tick,
  // so there's real data for the "reason" to draw on. In a real system this
  // is replaced by an actual news feed poll — the scoring logic below is
  // unchanged either way.
  if (quote.eventTick) maybeGenerateNews(quote.symbol);

  const vol = scoreVolatilityMove(quote);
  const volu = scoreVolumeAnomaly(quote);
  const breach = score52wBreach(quote);
  const gap = scoreGapOpen(quote);
  const circuit = scoreCircuitProximity(quote);

  const recentNews = getLatestNews(quote.symbol, 1)[0] || null;
  const recentNewsIsFresh = recentNews && Date.now() - recentNews.ts < 5 * 60 * 1000;
  const newsPoints = recentNewsIsFresh ? 10 : 0;

  const rawScore = vol.points + volu.points + breach.points + gap.points + circuit.points + newsPoints;
  const score = Math.max(0, Math.min(100, rawScore));

  const bucket = score >= 67 ? 'significant' : score >= 34 ? 'notable' : 'quiet';

  // Build the reason from whichever signals actually contributed, ranked by
  // contribution, so it reads as a real explanation rather than a template.
  const reasonParts = [];
  const direction = vol.movePct >= 0 ? 'up' : 'down';
  reasonParts.push({
    pts: vol.points,
    text: `${direction} ${Math.abs(vol.movePct).toFixed(1)}% (${Math.abs(vol.z).toFixed(1)}x normal daily move)`,
  });
  if (volu.points > 0) reasonParts.push({ pts: volu.points, text: `on ${volu.ratio.toFixed(1)}x average volume` });
  if (circuit.type === 'upper-hit') reasonParts.push({ pts: circuit.points, text: 'hit upper circuit' });
  else if (circuit.type === 'lower-hit') reasonParts.push({ pts: circuit.points, text: 'hit lower circuit' });
  else if (circuit.type === 'near-upper') reasonParts.push({ pts: circuit.points, text: 'approaching upper circuit' });
  else if (circuit.type === 'near-lower') reasonParts.push({ pts: circuit.points, text: 'approaching lower circuit' });
  if (breach.type === 'high') reasonParts.push({ pts: breach.points, text: 'new 52-week high' });
  else if (breach.type === 'low') reasonParts.push({ pts: breach.points, text: 'new 52-week low' });
  else if (breach.type === 'near-high') reasonParts.push({ pts: breach.points, text: 'near 52-week high' });
  else if (breach.type === 'near-low') reasonParts.push({ pts: breach.points, text: 'near 52-week low' });
  if (gap.points > 0) reasonParts.push({ pts: gap.points, text: `unusual gap ${gap.gapPct >= 0 ? 'up' : 'down'} at open` });
  if (newsPoints > 0 && recentNews) reasonParts.push({ pts: newsPoints, text: recentNews.headline });

  reasonParts.sort((a, b) => b.pts - a.pts);
  const reason = reasonParts.map((p) => p.text).slice(0, 3).join(', ');

  return {
    score,
    bucket,
    reason: reason || 'trading within normal range',
    signals: { vol, volu, breach, gap, circuit, newsPoints },
  };
}

module.exports = { computeAttentionScore };
