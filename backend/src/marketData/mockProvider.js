// mockProvider.js
// Simulated market data provider. Implements the same contract a real
// provider (Twelve Data, Finnhub, etc.) would — see provider.interface.js —
// so the rest of the system is written against an abstraction, not this
// specific implementation.
//
// Behavior modeled, deliberately, because these are exactly the conditions
// the "meaningful change" engine and the resilience layer need to be tested
// against:
//   - per-symbol random walk scaled by that symbol's baseline volatility
//   - occasional volume spikes (uncorrelated and correlated with big moves)
//   - circuit limits (NSE/BSE-style ±10% band from previous close) that can
//     actually be hit
//   - rare simulated provider failures (timeout / error), so the circuit
//     breaker and fallback path in resilience/ have something real to do

const { UNIVERSE, BY_SYMBOL } = require('./universe');

const FAILURE_RATE = Number(process.env.MOCK_PROVIDER_FAILURE_RATE || 0.03); // 3% of calls
const LATENCY_MS = Number(process.env.MOCK_PROVIDER_LATENCY_MS || 60);

// Mutable in-memory market state, seeded from the universe. This IS the
// "market" for the simulation — a real provider would have no equivalent,
// it would just be an HTTP call.
const state = new Map();

function todayKeySeed(symbol) {
  // deterministic-ish per-day seed so prevClose/open are stable within a run
  let h = 0;
  for (const c of symbol) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

function initSymbol(sym) {
  const meta = BY_SYMBOL[sym];
  const seed = todayKeySeed(sym);
  const gapPct = (((seed % 200) - 100) / 100) * (meta.baseVolPct / 100) * 1.5; // small gap at "open"
  const prevClose = meta.basePrice;
  const dayOpen = prevClose * (1 + gapPct);
  state.set(sym, {
    symbol: sym,
    price: dayOpen,
    prevClose,
    dayOpen,
    dayHigh: Math.max(dayOpen, prevClose),
    dayLow: Math.min(dayOpen, prevClose),
    volume: Math.floor(meta.baseVolume * 0.05),
    avgVolume20d: meta.baseVolume,
    volatility20dPct: meta.baseVolPct,
    high52w: prevClose * (1 + 0.15 + Math.random() * 0.2),
    low52w: prevClose * (1 - 0.15 - Math.random() * 0.2),
    upperCircuit: +(prevClose * 1.10).toFixed(2),
    lowerCircuit: +(prevClose * 0.90).toFixed(2),
  });
}

for (const u of UNIVERSE) initSymbol(u.symbol);

function tick(sym) {
  const meta = BY_SYMBOL[sym];
  const s = state.get(sym);

  // Random walk step, scaled by the symbol's baseline volatility.
  // Occasionally (5%) inject a larger move to simulate a real "event" tick —
  // this is what should trip the attention-score engine's z-score signal.
  const isEventTick = Math.random() < 0.05;
  const stepScale = (meta.baseVolPct / 100) * (isEventTick ? 4 : 0.6);
  const drift = (Math.random() - 0.5) * 2 * stepScale;
  s.price = Math.max(0.5, s.price * (1 + drift));

  // Clamp to circuit limits — a real market halts trading here.
  s.price = Math.min(s.upperCircuit, Math.max(s.lowerCircuit, s.price));

  s.dayHigh = Math.max(s.dayHigh, s.price);
  s.dayLow = Math.min(s.dayLow, s.price);

  // Volume increment: baseline trickle, with a spike correlated to event ticks
  // (so "volume anomaly" and "volatility-adjusted move" signals co-occur the
  // way they do in real markets — moves with conviction come with volume).
  const volumeStep = Math.floor(
    meta.baseVolume * (0.001 + Math.random() * 0.002) * (isEventTick ? 8 : 1)
  );
  s.volume += volumeStep;

  if (s.price >= s.high52w) s.high52w = s.price;
  if (s.price <= s.low52w) s.low52w = s.price;

  return isEventTick;
}

let forcedFailure = false;

function setForcedFailure(enabled) {
  forcedFailure = Boolean(enabled);
}

function getForcedFailure() {
  return forcedFailure;
}

function shockSymbol(sym, pctMove = 4.5, volumeMultiplier = 4.0) {
  if (!state.has(sym)) throw new Error(`unknown symbol: ${sym}`);
  const s = state.get(sym);
  const meta = BY_SYMBOL[sym];
  
  // Apply targeted price shock
  const newPrice = s.price * (1 + pctMove / 100);
  s.price = Math.min(s.upperCircuit, Math.max(s.lowerCircuit, +newPrice.toFixed(2)));
  s.dayHigh = Math.max(s.dayHigh, s.price);
  s.dayLow = Math.min(s.dayLow, s.price);
  
  // Inject volume spike
  s.volume += Math.floor(meta.baseVolume * (volumeMultiplier * 0.1));
  if (s.price >= s.high52w) s.high52w = s.price;
  if (s.price <= s.low52w) s.low52w = s.price;

  return {
    symbol: sym,
    price: +s.price.toFixed(2),
    volume: s.volume,
    dayOpen: +s.dayOpen.toFixed(2),
    prevClose: +s.prevClose.toFixed(2),
    dayHigh: +s.dayHigh.toFixed(2),
    dayLow: +s.dayLow.toFixed(2),
    upperCircuit: s.upperCircuit,
    lowerCircuit: s.lowerCircuit,
    high52w: +s.high52w.toFixed(2),
    low52w: +s.low52w.toFixed(2),
    avgVolume20d: s.avgVolume20d,
    volatility20dPct: s.volatility20dPct,
    eventTick: true,
    ts: Date.now(),
  };
}

function resetSymbol(sym) {
  if (sym) initSymbol(sym);
  else for (const u of UNIVERSE) initSymbol(u.symbol);
}

function simulateLatencyAndFailure() {
  return new Promise((resolve, reject) => {
    if (forcedFailure) {
      return setTimeout(() => reject(new Error('mock provider: forced upstream outage')), 30);
    }
    setTimeout(() => {
      if (Math.random() < FAILURE_RATE) {
        reject(new Error('mock provider: simulated upstream failure'));
      } else {
        resolve();
      }
    }, LATENCY_MS + Math.random() * 40);
  });
}

async function getQuote(symbol) {
  await simulateLatencyAndFailure();
  if (!state.has(symbol)) throw new Error(`unknown symbol: ${symbol}`);
  const eventTick = tick(symbol);
  const s = state.get(symbol);
  return {
    symbol,
    price: +s.price.toFixed(2),
    volume: s.volume,
    dayOpen: +s.dayOpen.toFixed(2),
    prevClose: +s.prevClose.toFixed(2),
    dayHigh: +s.dayHigh.toFixed(2),
    dayLow: +s.dayLow.toFixed(2),
    upperCircuit: s.upperCircuit,
    lowerCircuit: s.lowerCircuit,
    high52w: +s.high52w.toFixed(2),
    low52w: +s.low52w.toFixed(2),
    avgVolume20d: s.avgVolume20d,
    volatility20dPct: s.volatility20dPct,
    eventTick,
    ts: Date.now(),
  };
}

async function getQuotes(symbols) {
  // Real providers usually support batched calls too — modeled the same way
  // here so the poller's call pattern doesn't change when swapped for real.
  const entries = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const q = await getQuote(sym);
        return [sym, q];
      } catch (err) {
        return [sym, { error: err.message }];
      }
    })
  );
  return new Map(entries);
}

module.exports = { 
  getQuote, 
  getQuotes, 
  shockSymbol, 
  setForcedFailure, 
  getForcedFailure, 
  resetSymbol 
};
