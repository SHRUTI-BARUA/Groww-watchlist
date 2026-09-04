// summary.js
// Aggregates list-level "Quiet Confirmation" state over per-ticker attention scores.
// Computes a single trustworthy headline so users can immediately know if nothing
// noteworthy occurred without having to scan every single row.

function computeWatchlistSummary(items = [], sinceTs = null) {
  if (!items || items.length === 0) {
    return null;
  }

  const validItems = items.filter((i) => !i.error);
  const unavailableCount = items.length - validItems.length;

  const quietCount = validItems.filter((i) => (i.attention?.bucket || 'quiet') === 'quiet').length;
  const notableCount = validItems.filter((i) => i.attention?.bucket === 'notable').length;
  const significantCount = validItems.filter((i) => i.attention?.bucket === 'significant').length;

  let state = 'all-clear';
  if (significantCount > 0) {
    state = 'significant-present';
  } else if (notableCount > 0) {
    state = 'notable-present';
  }

  let message = '';
  const isFirstView = !sinceTs;

  if (state === 'all-clear') {
    if (isFirstView) {
      message = `All ${quietCount} tickers quiet — no moves outside normal statistical range.`;
    } else {
      message = `Checked while you were away — all ${quietCount} tickers remained within normal statistical range.`;
    }
  } else if (state === 'significant-present') {
    message = `${significantCount} ticker${significantCount > 1 ? 's' : ''} require immediate attention (${notableCount} notable).`;
  } else {
    message = `${notableCount} ticker${notableCount > 1 ? 's' : ''} showing notable activity (${quietCount} quiet).`;
  }

  if (unavailableCount > 0) {
    message += ` (${unavailableCount} ticker${unavailableCount > 1 ? 's' : ''} currently unavailable).`;
  }

  return {
    state,
    quietCount,
    notableCount,
    significantCount,
    unavailableCount,
    message,
  };
}

module.exports = { computeWatchlistSummary };
