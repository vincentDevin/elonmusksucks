// apps/server/src/utils/userCache.ts
import type { User } from '@prisma/client';

interface CacheEntry {
  data: User;
  timestamp: number;
  ttl: number;
}

class UserCache {
  private cache = new Map<number, CacheEntry>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds

  set(userId: number, user: User, ttl = this.DEFAULT_TTL): void {
    this.cache.set(userId, {
      data: user,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(userId: number): User | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(userId);
      return null;
    }

    return entry.data;
  }

  invalidate(userId: number): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(userId);
      }
    }
  }
}

// Global cache instance
export const userCache = new UserCache();

// Clean up expired entries every 2 minutes
setInterval(() => userCache.cleanup(), 2 * 60 * 1000);
