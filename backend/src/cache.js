// cache.js
// In-memory shared quote cache with TTL semantics and Last-Known-Good (LKG)
// stale retrieval for resilient circuit breaker fallbacks.

const store = new Map(); // key -> { value, expiresAt, lastUpdated }

function set(key, value, ttlMs = 10_000) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    lastUpdated: Date.now(),
  });
}

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    return null; // Expired for fresh reads
  }
  return entry.value;
}

// Returns the last-known-good value regardless of TTL for graceful degradation
function getStale(key) {
  const entry = store.get(key);
  return entry ? entry.value : null;
}

function has(key) {
  return get(key) !== null;
}

function clear() {
  store.clear();
}

module.exports = { get, getStale, set, has, clear };
