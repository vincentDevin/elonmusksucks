// apps/client/src/lib/requestManager.ts
// Rollback: Remove this file and revert axios interceptors to original state

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicationManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly ttl: number;

  constructor(ttlMs = 150) {
    this.ttl = ttlMs;
  }

  /**
   * Generate cache key from request config
   */
  private getCacheKey(method: string, url: string, params?: any, data?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method.toUpperCase()}:${url}:${paramStr}:${dataStr}`;
  }

  /**
   * Clean up expired requests
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.ttl) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Get or create a request promise
   */
  dedupe<T>(
    method: string,
    url: string,
    requestFn: () => Promise<T>,
    params?: any,
    data?: any,
  ): Promise<T> {
    const key = this.getCacheKey(method, url, params, data);

    // Clean up expired entries
    this.cleanup();

    // Check if request already exists and is still valid
    const existing = this.pendingRequests.get(key);
    if (existing && Date.now() - existing.timestamp <= this.ttl) {
      return existing.promise;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from cache when done (success or error)
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear all pending requests (useful for hard refresh)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get current pending request count (for debugging)
   */
  getPendingCount(): number {
    this.cleanup();
    return this.pendingRequests.size;
  }
}

// Export singleton instance
export const requestManager = new RequestDeduplicationManager();
