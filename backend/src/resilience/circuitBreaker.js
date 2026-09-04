// circuitBreaker.js
// Minimal circuit breaker: after N consecutive failures calling a provider,
// trip the breaker and stop calling it for a cooldown window, instead
// immediately returning a "provider unavailable" signal so callers can fall
// back to last-known-good data (see engine/quoteService.js). Half-open state
// allows a single trial call after cooldown to test recovery.
//
// Deliberately simple (in-memory, per-process) — this is the right amount of
// resilience engineering for this build's scale (see design doc §2.6); a
// distributed rate of a real multi-instance deployment would want this state
// shared via Redis instead of process memory.

class CircuitBreaker {
  constructor({ failureThreshold = 3, cooldownMs = 5000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.state = 'closed'; // closed | open | half-open
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  canAttempt() {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true; // half-open: allow the trial call
  }

  onSuccess() {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  onFailure() {
    this.consecutiveFailures += 1;
    if (this.state === 'half-open' || this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }

  getState() {
    return this.state;
  }
}

module.exports = { CircuitBreaker };
