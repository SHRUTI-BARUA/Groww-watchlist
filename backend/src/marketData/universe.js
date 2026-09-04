// universe.js
// Static "listing" data for the simulated market: base price, sector,
// baseline daily volatility (%) and baseline daily volume. This mirrors the
// kind of reference data a real provider (or exchange master file) would
// give you, and is the seed the mock tick engine builds on.

const UNIVERSE = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', basePrice: 2950, baseVolPct: 1.1, baseVolume: 6_500_000 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', basePrice: 4150, baseVolPct: 0.9, baseVolume: 2_100_000 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', basePrice: 1680, baseVolPct: 1.0, baseVolume: 8_900_000 },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT', basePrice: 1890, baseVolPct: 1.2, baseVolume: 5_400_000 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', basePrice: 1245, baseVolPct: 1.3, baseVolume: 9_800_000 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', basePrice: 1780, baseVolPct: 1.1, baseVolume: 4_200_000 },
  { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking', basePrice: 1190, baseVolPct: 1.2, baseVolume: 6_800_000 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', basePrice: 985, baseVolPct: 2.1, baseVolume: 12_300_000 },
  { symbol: 'ZOMATO', name: 'Eternal (Zomato)', sector: 'Consumer Internet', basePrice: 268, baseVolPct: 3.2, baseVolume: 21_000_000 },
  { symbol: 'SUZLON', name: 'Suzlon Energy', sector: 'Power', basePrice: 62, baseVolPct: 4.5, baseVolume: 55_000_000 },
  { symbol: 'ADANIPOWER', name: 'Adani Power', sector: 'Power', basePrice: 610, baseVolPct: 3.0, baseVolume: 8_100_000 },
  { symbol: 'YESBANK', name: 'Yes Bank', sector: 'Banking', basePrice: 21, baseVolPct: 3.8, baseVolume: 60_000_000 },
  { symbol: 'BSE', name: 'BSE Ltd', sector: 'Financial Services', basePrice: 4850, baseVolPct: 3.5, baseVolume: 1_800_000 },
  { symbol: 'IRFC', name: 'Indian Railway Finance Corp', sector: 'Financial Services', basePrice: 155, baseVolPct: 2.4, baseVolume: 15_000_000 },
];

const SYMBOLS = UNIVERSE.map(u => u.symbol);
const BY_SYMBOL = Object.fromEntries(UNIVERSE.map(u => [u.symbol, u]));

module.exports = { UNIVERSE, SYMBOLS, BY_SYMBOL };
