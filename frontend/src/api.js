const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let token = localStorage.getItem('watchlist_token') || null;

function setToken(t) {
  token = t;
  if (t) localStorage.setItem('watchlist_token', t);
  else localStorage.removeItem('watchlist_token');
}

function getToken() {
  return token;
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const err = new Error(data?.error || `request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  setToken,
  getToken,
  register: (email, password) => request('/api/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  listWatchlists: () => request('/api/watchlists'),
  createWatchlist: (name) => request('/api/watchlists', { method: 'POST', body: { name } }),
  renameWatchlist: (id, name) => request(`/api/watchlists/${id}`, { method: 'PUT', body: { name } }),
  deleteWatchlist: (id) => request(`/api/watchlists/${id}`, { method: 'DELETE' }),
  addItem: (watchlistId, symbol) => request(`/api/watchlists/${watchlistId}/items`, { method: 'POST', body: { symbol } }),
  removeItem: (watchlistId, symbol) => request(`/api/watchlists/${watchlistId}/items/${symbol}`, { method: 'DELETE' }),
  viewWatchlist: (watchlistId) => request(`/api/watchlists/${watchlistId}/view`),
  markSeen: (watchlistId) => request(`/api/watchlists/${watchlistId}/mark-seen`, { method: 'POST' }),
  searchUniverse: (q) => request(`/api/market/universe${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getMarketOverview: () => request('/api/market/overview'),
  getTickerHistory: (symbol) => request(`/api/market/history/${symbol}`),
  simulateShock: (symbol, pctMove, volumeMultiplier) => request('/api/market/simulate-shock', { method: 'POST', body: { symbol, pctMove, volumeMultiplier } }),
  simulateNews: (symbol, headline, tag) => request('/api/market/simulate-news', { method: 'POST', body: { symbol, headline, tag } }),
  simulateBreaker: (enable) => request('/api/market/simulate-breaker', { method: 'POST', body: { enable } }),
  simulateReset: (symbol) => request('/api/market/simulate-reset', { method: 'POST', body: { symbol } }),
};

export const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:4000') + '/ws';
