// Client-side Token Bucket Rate Limiter (to prevent API key quota exhaustion)

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private static readonly MAX_TOKENS = 12; // Maximum capacity of the bucket
  private static readonly REFILL_RATE_MS = 5 * 60 * 1000; // Time required to refill 1 token (5 minutes)

  private static getBucket(key: string): BucketState {
    if (typeof window === 'undefined') {
      return { tokens: RateLimiter.MAX_TOKENS, lastRefill: Date.now() };
    }
    const stored = localStorage.getItem(`rate_limit_bucket_${key}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fallback on corrupt JSON
      }
    }
    return { tokens: RateLimiter.MAX_TOKENS, lastRefill: Date.now() };
  }

  private static saveBucket(key: string, state: BucketState): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`rate_limit_bucket_${key}`, JSON.stringify(state));
  }

  /**
   * Attempts to consume a specified number of tokens from the bucket.
   * Returns true if tokens were successfully consumed, false otherwise.
   */
  static consume(key: string, count: number = 1): boolean {
    const state = RateLimiter.getBucket(key);
    const now = Date.now();

    // Calculate refilled tokens based on time elapsed
    const elapsed = now - state.lastRefill;
    const refilledTokens = Math.floor(elapsed / RateLimiter.REFILL_RATE_MS);

    if (refilledTokens > 0) {
      state.tokens = Math.min(RateLimiter.MAX_TOKENS, state.tokens + refilledTokens);
      state.lastRefill = state.lastRefill + (refilledTokens * RateLimiter.REFILL_RATE_MS);
    }

    if (state.tokens >= count) {
      state.tokens -= count;
      RateLimiter.saveBucket(key, state);
      return true;
    }

    return false;
  }

  /**
   * Retrieves the remaining time in seconds until the next token refills.
   */
  static getSecondsToNextRefill(key: string): number {
    const state = RateLimiter.getBucket(key);
    if (state.tokens >= RateLimiter.MAX_TOKENS) return 0;
    const now = Date.now();
    const elapsed = now - state.lastRefill;
    const nextRefillIn = RateLimiter.REFILL_RATE_MS - (elapsed % RateLimiter.REFILL_RATE_MS);
    return Math.ceil(nextRefillIn / 1000);
  }

  /**
   * Retrieves current number of tokens available.
   */
  static getAvailableTokens(key: string): number {
    const state = RateLimiter.getBucket(key);
    const now = Date.now();
    const elapsed = now - state.lastRefill;
    const refilledTokens = Math.floor(elapsed / RateLimiter.REFILL_RATE_MS);
    return Math.min(RateLimiter.MAX_TOKENS, state.tokens + refilledTokens);
  }
}
