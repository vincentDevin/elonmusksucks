// Rollback: Delete this file and remove sessionStorage caching from TimelineContext
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SessionCache {
  private readonly prefix = 'ems_cache_';

  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      };
      sessionStorage.setItem(`${this.prefix}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(`${this.prefix}${key}`);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const isExpired = Date.now() - entry.timestamp > entry.ttl;

      if (isExpired) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  delete(key: string): void {
    sessionStorage.removeItem(`${this.prefix}${key}`);
  }

  clear(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

export const sessionCache = new SessionCache();
