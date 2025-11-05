// lib/rpc-rate-limiter.ts

/**
 * Global RPC Rate Limiter
 * Ensures a hard maximum (~200/sec) API rate across all app components.
 * Uses a queue and highly accurate timing to avoid exceeding provider limits,
 * even under event loop or batch call stress.
 */

const MAX_CALLS_PER_SECOND = 200; // Hard RPC ceiling for all endpoints.
const MIN_DELAY_MS = 1000 / MAX_CALLS_PER_SECOND; // Minimum interval between calls (in ms).

// Use performance.now() for monotonic interval math, avoids system clock issues.
const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

class RPCRateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private lastCallTime = 0;
  private callCount = 0;
  private windowStart = nowMs();

  /**
   * Executes an RPC call with global rate limiting.
   * Returns a Promise that resolves or rejects when the call finishes.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error); // Never swallow errors
        }
      });
      this.processQueue();
    });
  }

  /**
   * Internal: Processes the pending call queue, accurately enforcing the rate window.
   * Uses monotonic timers (performance.now) for cross-browser stability.
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Reset rate window if more than 1s has elapsed
      let now = nowMs();
      if (now - this.windowStart >= 1000) {
        this.callCount = 0;
        this.windowStart = now;
      }

      // If call limit hit, wait for next window before proceeding
      if (this.callCount >= MAX_CALLS_PER_SECOND) {
        const waitTime = Math.max(0, 1000 - (now - this.windowStart));
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        // After waiting, reset window and callCount
        this.callCount = 0;
        this.windowStart = nowMs();
        now = nowMs();
      }

      // Guarantee minimum delay from last actual call to smooth burst load
      const sinceLastCall = now - this.lastCallTime;
      if (sinceLastCall < MIN_DELAY_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_DELAY_MS - sinceLastCall),
        );
      }

      // Dequeue and execute next call
      const call = this.queue.shift();
      if (call) {
        this.lastCallTime = nowMs();
        this.callCount++;
        call(); // Trigger user callback
      }
    }

    this.processing = false;
  }

  /**
   * Execute multiple RPC calls with batching and strict overall limit.
   * Batch size is adjustable for optimal network/provider behavior.
   * Any rejected promises are returned as `undefined` in results.
   */
  async executeBatch<T>(
    calls: Array<() => Promise<T>>,
    batchSize: number = 10,
  ): Promise<(T | undefined)[]> {
    const results: (T | undefined)[] = new Array(calls.length);

    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      // By running .map(call => this.execute(call)), we enforce individual throttling
      const batchResults = await Promise.allSettled(
        batch.map((call) => this.execute(call)),
      );

      batchResults.forEach((result, idx) => {
        results[i + idx] =
          result.status === "fulfilled" ? result.value : undefined;
      });

      // Add a pause between batches for surer pacing (edge-case protection)
      if (i + batchSize < calls.length)
        await new Promise((res) => setTimeout(res, 10));
    }

    return results;
  }
}

// Export a singleton limiter for global use in app
export const rpcRateLimiter = new RPCRateLimiter();

/**
 * NOTES FOR NON-DEVELOPERS:
 * - This limiter coordinates ALL contract/network/RPC calls in one queue for the whole frontend.
 * - If a user hammers refresh, or a script triggers hundreds of loads, API won't break rate limits and all valid requests will still eventually resolve in order.
 * - executeBatch is ideal for loading multiple token states, owner checks, etc., with safe network load.
 * - All error states are passed through; network/RPC errors bubble up and will show in your UI error handler.
 */
