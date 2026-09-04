// provider.interface.js
// This file documents the contract every market data provider must satisfy.
// It's not enforced by TypeScript here (kept plain JS deliberately — see
// design doc §2.6, simplicity over ceremony for a hackathon-scale build),
// but every provider (mock or real) must implement:
//
//   async getQuote(symbol) -> {
//     symbol, price, volume, dayOpen, prevClose, dayHigh, dayLow,
//     upperCircuit, lowerCircuit, high52w, low52w, avgVolume20d,
//     volatility20dPct, ts
//   }
//   async getQuotes(symbols: string[]) -> Map<symbol, quote>
//
// Swapping the mock provider for a real one (Twelve Data / Finnhub) means
// writing one new file that satisfies this same shape and changing one
// require() in worker/poller.js. Nothing else in the system should need to
// know whether the data is real or simulated.

module.exports = {}; // documentation-only module
