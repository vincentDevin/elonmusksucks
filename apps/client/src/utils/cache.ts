// apps/client/src/utils/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Clean up expired entries every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

// Cache keys
export const CACHE_KEYS = {
  USER_STATS: (userId: number) => `user_stats_${userId}`,
  USER_LEADERBOARD: (userId: number, type: string) => `user_leaderboard_${userId}_${type}`,
  USER_ACHIEVEMENTS: (userId: number) => `user_achievements_${userId}`,
  USER_RECENT_ACHIEVEMENTS: (userId: number) => `user_recent_achievements_${userId}`,
  MARKET_OVERVIEW: 'market_overview',
  PREDICTIONS: 'predictions',
} as const;

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 30000, // 30 seconds
  MEDIUM: 60000, // 1 minute
  LONG: 300000, // 5 minutes
  VERY_LONG: 900000, // 15 minutes
} as const;
