// clustering.js
// Pure function for Correlated-Move Clustering (Feature 2).
// Detects when multiple watched tickers in the same sector move together and
// collapses them into a single grouped insight instead of N redundant rows.

function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function detectClusters(items = []) {
  if (!items || items.length === 0) {
    return { clusters: [], items: [] };
  }

  // Deep clone or shallow copy items to avoid mutating input unexpectedly
  const processedItems = items.map((item) => ({ ...item }));

  // Step 1: Filter non-quiet, valid items and group candidate tickers by sector
  const sectorGroups = new Map();

  for (const item of processedItems) {
    if (item.error) continue;
    const bucket = item.attention?.bucket;
    const sector = item.meta?.sector;
    if (bucket && bucket !== 'quiet' && sector) {
      if (!sectorGroups.has(sector)) {
        sectorGroups.set(sector, []);
      }
      sectorGroups.get(sector).push(item);
    }
  }

  const clusters = [];
  let clusterIndex = 1;

  // Step 2: Evaluate each sector candidate group
  for (const [sector, group] of sectorGroups.entries()) {
    if (group.length < 2) continue;

    // Check directional agreement (all up or all down)
    const directions = group.map((i) => {
      const move = i.attention?.signals?.vol?.movePct ?? ((i.quote.price - i.quote.prevClose) / i.quote.prevClose) * 100;
      return move >= 0 ? 'up' : 'down';
    });

    const allUp = directions.every((d) => d === 'up');
    const allDown = directions.every((d) => d === 'down');

    if (!allUp && !allDown) {
      // Divergent moves in the same sector are separate idiosyncratic stories, not a cluster
      continue;
    }

    const direction = allUp ? 'up' : 'down';

    // Check magnitude coherence using |z-score|
    const zScores = group.map((i) => Math.abs(i.attention?.signals?.vol?.z || 0));
    const medianZ = calculateMedian(zScores);

    // Filter out outlier tickers whose |z-score| is > 2x the median (individual stock-specific event)
    const coherentItems = [];
    for (const item of group) {
      const z = Math.abs(item.attention?.signals?.vol?.z || 0);
      if (medianZ > 0 && z > 2.0 * medianZ) {
        // Outlier: keep standalone so its specific catalyst isn't swallowed
        continue;
      }
      coherentItems.push(item);
    }

    if (coherentItems.length < 2) {
      // Not enough coherent tickers left to form a cluster
      continue;
    }

    // Step 3: Check for shared news causes
    const clusterSymbols = coherentItems.map((i) => i.symbol);
    const clusterNews = [];

    for (const item of coherentItems) {
      if (item.diff?.news && item.diff.news.length > 0) {
        clusterNews.push(...item.diff.news);
      }
    }

    let sharedCause = '';
    if (clusterNews.length >= 2) {
      // Check if there's a shared recent headline or common tag
      const firstHeadline = clusterNews[0].headline;
      sharedCause = `on ${firstHeadline}`;
    } else {
      sharedCause = 'on broad sector momentum';
    }

    const clusterId = `cluster-${sector.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${clusterIndex++}`;
    const avgScore = Math.round(
      coherentItems.reduce((acc, i) => acc + (i.attention?.score || 0), 0) / coherentItems.length
    );

    const clusterReason = `${sector} sector-wide move — ${clusterSymbols.join(', ')} all ${direction} ${sharedCause}.`;

    // Mark clusterId on member items
    for (const item of coherentItems) {
      item.clusterId = clusterId;
    }

    clusters.push({
      id: clusterId,
      sector,
      direction,
      symbols: clusterSymbols,
      reason: clusterReason,
      avgScore,
      itemCount: coherentItems.length,
    });
  }

  return {
    clusters,
    items: processedItems,
  };
}

module.exports = { detectClusters, calculateMedian };
