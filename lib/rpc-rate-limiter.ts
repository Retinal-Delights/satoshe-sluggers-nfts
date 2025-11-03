// lib/rpc-rate-limiter.ts
/**
 * Global RPC Rate Limiter
 * Ensures we never exceed 200 RPC calls per second across all components
 * Uses a queue system with proper spacing between calls
 */

const MAX_CALLS_PER_SECOND = 200;
const MIN_DELAY_MS = 1000 / MAX_CALLS_PER_SECOND; // 5ms between calls = 200/sec max

class RPCRateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private lastCallTime = 0;
  private callCount = 0;
  private windowStart = Date.now();

  /**
   * Execute an RPC call with rate limiting
   * @param fn - Function that performs the RPC call
   * @returns Promise that resolves when the call completes
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * Process the queue of RPC calls with proper rate limiting
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Reset window if a second has passed
      const now = Date.now();
      if (now - this.windowStart >= 1000) {
        this.callCount = 0;
        this.windowStart = now;
      }

      // Check if we're at the limit for this second
      if (this.callCount >= MAX_CALLS_PER_SECOND) {
        // Wait until next second
        const waitTime = 1000 - (now - this.windowStart);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.callCount = 0;
        this.windowStart = Date.now();
      }

      // Ensure minimum delay between calls
      const timeSinceLastCall = now - this.lastCallTime;
      if (timeSinceLastCall < MIN_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - timeSinceLastCall));
      }

      // Execute the next call
      const call = this.queue.shift();
      if (call) {
        this.lastCallTime = Date.now();
        this.callCount++;
        call();
      }
    }

    this.processing = false;
  }

  /**
   * Execute multiple RPC calls in a batch with rate limiting
   * @param calls - Array of functions that perform RPC calls
   * @returns Promise that resolves when all calls complete (includes undefined for failed calls)
   */
  async executeBatch<T>(calls: Array<() => Promise<T>>, batchSize: number = 10): Promise<(T | undefined)[]> {
    const results: (T | undefined)[] = [];
    
    // Process in smaller batches to avoid overwhelming the queue
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(call => this.execute(call))
      );
      
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results[i + idx] = result.value;
        } else {
          results[i + idx] = undefined;
        }
      });

      // Small delay between batches to stay under limit
      if (i + batchSize < calls.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }
}

// Export singleton instance
export const rpcRateLimiter = new RPCRateLimiter();

