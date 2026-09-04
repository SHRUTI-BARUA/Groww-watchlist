const { computeWatchlistSummary } = require('../src/engine/summary');
const { detectClusters, calculateMedian } = require('../src/engine/clustering');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== RUNNING ENGINE UNIT TESTS (Quiet Confirmation + Clustering) ===\n');

// 1. Median calculation
console.log('1. Testing calculateMedian...');
assert(calculateMedian([1, 2, 3]) === 2, 'Odd median');
assert(calculateMedian([1, 2, 3, 4]) === 2.5, 'Even median');
assert(calculateMedian([5]) === 5, 'Single item median');
assert(calculateMedian([]) === 0, 'Empty median');

// 2. computeWatchlistSummary tests
console.log('2. Testing computeWatchlistSummary...');

// 2a. Empty list
assert(computeWatchlistSummary([]) === null, 'Empty list should return null');

// 2b. All quiet
const allQuietItems = [
  { symbol: 'RELIANCE', attention: { score: 10, bucket: 'quiet' }, quote: { price: 2950 } },
  { symbol: 'TCS', attention: { score: 12, bucket: 'quiet' }, quote: { price: 4150 } },
  { symbol: 'INFY', attention: { score: 15, bucket: 'quiet' }, quote: { price: 1890 } },
];
const quietSummary = computeWatchlistSummary(allQuietItems, Date.now() - 3600000);
assert(quietSummary.state === 'all-clear', 'State should be all-clear');
assert(quietSummary.quietCount === 3, 'quietCount should be 3');
assert(quietSummary.notableCount === 0, 'notableCount should be 0');
assert(quietSummary.significantCount === 0, 'significantCount should be 0');
assert(quietSummary.message.includes('Checked while you were away'), 'Message should reference check');

// 2c. All quiet first-view
const quietFirstView = computeWatchlistSummary(allQuietItems, null);
assert(quietFirstView.state === 'all-clear', 'State should be all-clear on first view');
assert(quietFirstView.message.includes('All 3 tickers quiet'), 'Message should adjust on first view');

// 2d. Notable present
const notableItems = [
  { symbol: 'RELIANCE', attention: { score: 45, bucket: 'notable' }, quote: { price: 3100 } },
  { symbol: 'TCS', attention: { score: 12, bucket: 'quiet' }, quote: { price: 4150 } },
];
const notableSummary = computeWatchlistSummary(notableItems, Date.now() - 3600000);
assert(notableSummary.state === 'notable-present', 'State should be notable-present');
assert(notableSummary.notableCount === 1, 'notableCount should be 1');

// 2e. Significant present
const sigItems = [
  { symbol: 'RELIANCE', attention: { score: 85, bucket: 'significant' }, quote: { price: 3245 } },
  { symbol: 'TCS', attention: { score: 45, bucket: 'notable' }, quote: { price: 4150 } },
  { symbol: 'INFY', attention: { score: 12, bucket: 'quiet' }, quote: { price: 1890 } },
];
const sigSummary = computeWatchlistSummary(sigItems, Date.now() - 3600000);
assert(sigSummary.state === 'significant-present', 'State should be significant-present');
assert(sigSummary.significantCount === 1, 'significantCount should be 1');
assert(sigSummary.notableCount === 1, 'notableCount should be 1');

// 2f. Partial data failure
const partialItems = [
  { symbol: 'RELIANCE', attention: { score: 10, bucket: 'quiet' }, quote: { price: 2950 } },
  { symbol: 'UNKNOWN', error: 'provider timeout' },
];
const partialSummary = computeWatchlistSummary(partialItems, Date.now() - 3600000);
assert(partialSummary.unavailableCount === 1, 'unavailableCount should be 1');
assert(partialSummary.message.includes('1 ticker currently unavailable'), 'Unavailable notice in message');

console.log('✅ computeWatchlistSummary tests passed!\n');

// 3. detectClusters tests
console.log('3. Testing detectClusters...');

// 3a. Coherent sector cluster (3 banking stocks moving up together)
const bankingGroup = [
  {
    symbol: 'HDFCBANK',
    meta: { sector: 'Banking' },
    quote: { price: 1720, prevClose: 1680 },
    attention: { score: 48, bucket: 'notable', signals: { vol: { movePct: 2.38, z: 2.38 } } },
    diff: { news: [] },
  },
  {
    symbol: 'ICICIBANK',
    meta: { sector: 'Banking' },
    quote: { price: 1275, prevClose: 1245 },
    attention: { score: 46, bucket: 'notable', signals: { vol: { movePct: 2.41, z: 1.85 } } },
    diff: { news: [] },
  },
  {
    symbol: 'KOTAKBANK',
    meta: { sector: 'Banking' },
    quote: { price: 1820, prevClose: 1780 },
    attention: { score: 44, bucket: 'notable', signals: { vol: { movePct: 2.25, z: 2.04 } } },
    diff: { news: [] },
  },
  {
    symbol: 'TCS',
    meta: { sector: 'IT' },
    quote: { price: 4150, prevClose: 4150 },
    attention: { score: 10, bucket: 'quiet', signals: { vol: { movePct: 0, z: 0 } } },
    diff: { news: [] },
  },
];

const clusterRes1 = detectClusters(bankingGroup);
assert(clusterRes1.clusters.length === 1, 'Should detect 1 banking cluster');
assert(clusterRes1.clusters[0].sector === 'Banking', 'Cluster sector should be Banking');
assert(clusterRes1.clusters[0].direction === 'up', 'Cluster direction should be up');
assert(clusterRes1.clusters[0].symbols.length === 3, 'Cluster should contain all 3 banking symbols');
assert(clusterRes1.items.find(i => i.symbol === 'HDFCBANK').clusterId === clusterRes1.clusters[0].id, 'Item should have clusterId linked');
assert(!clusterRes1.items.find(i => i.symbol === 'TCS').clusterId, 'Quiet TCS should not have clusterId');

// 3b. Opposite directions in same sector (should NOT cluster)
const opposingBanking = [
  {
    symbol: 'HDFCBANK',
    meta: { sector: 'Banking' },
    quote: { price: 1720, prevClose: 1680 },
    attention: { score: 48, bucket: 'notable', signals: { vol: { movePct: 2.38, z: 2.38 } } },
  },
  {
    symbol: 'ICICIBANK',
    meta: { sector: 'Banking' },
    quote: { price: 1200, prevClose: 1245 },
    attention: { score: 52, bucket: 'notable', signals: { vol: { movePct: -3.61, z: -2.78 } } },
  },
];
const clusterRes2 = detectClusters(opposingBanking);
assert(clusterRes2.clusters.length === 0, 'Opposite direction moves should NOT cluster');

// 3c. Outlier ticker magnitude (should exclude outlier and cluster the rest)
const outlierBanking = [
  {
    symbol: 'HDFCBANK',
    meta: { sector: 'Banking' },
    quote: { price: 1710, prevClose: 1680 },
    attention: { score: 40, bucket: 'notable', signals: { vol: { movePct: 1.78, z: 1.78 } } },
  },
  {
    symbol: 'ICICIBANK',
    meta: { sector: 'Banking' },
    quote: { price: 1268, prevClose: 1245 },
    attention: { score: 42, bucket: 'notable', signals: { vol: { movePct: 1.84, z: 1.42 } } },
  },
  {
    symbol: 'YESBANK',
    meta: { sector: 'Banking' },
    quote: { price: 28, prevClose: 21 },
    // Extreme outlier: +33.3% / z = 8.76 (profit warning / takeover rumor)
    attention: { score: 95, bucket: 'significant', signals: { vol: { movePct: 33.3, z: 8.76 } } },
  },
];
const clusterRes3 = detectClusters(outlierBanking);
assert(clusterRes3.clusters.length === 1, 'Should form 1 cluster from coherent members');
assert(clusterRes3.clusters[0].symbols.length === 2, 'Cluster should contain 2 items (excluding YESBANK)');
assert(clusterRes3.clusters[0].symbols.includes('HDFCBANK') && clusterRes3.clusters[0].symbols.includes('ICICIBANK'), 'Should contain HDFCBANK & ICICIBANK');
const yesbankItem = clusterRes3.items.find(i => i.symbol === 'YESBANK');
assert(!yesbankItem.clusterId, 'Outlier YESBANK should remain standalone without clusterId');

console.log('✅ detectClusters tests passed!\n');
console.log('=== ALL ENGINE UNIT TESTS PASSED (100%) ===');
