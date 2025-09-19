// apps/client/src/lib/contextCaching.ts
// Standardized caching utilities for React contexts
// Based on ActivityContext pattern for consistent caching across all contexts

export interface CacheConfig {
  keyPrefix: string;
  expiryMs: number;
  enableUserSeparation?: boolean;
}

export interface CacheUtilities<T> {
  getStoredData: (userId?: number) => Partial<T>;
  getStoredHasInitialized: (userId?: number) => boolean;
  storeData: (data: Partial<T>, userId?: number) => void;
  clearStoredData: (userId?: number) => void;
}

/**
 * Creates standardized caching utilities for a React context
 * Follows the ActivityContext pattern for consistent behavior
 */
export function createCacheUtilities<T>(config: CacheConfig): CacheUtilities<T> {
  const { keyPrefix, expiryMs, enableUserSeparation = false } = config;

  const STORAGE_KEYS = {
    DATA: `ems_${keyPrefix}`,
    HAS_INITIALIZED: `ems_${keyPrefix}_initialized`,
    TIMESTAMP: `ems_${keyPrefix}_timestamp`,
  };

  const getCacheKey = (key: string, userId?: number): string => {
    return enableUserSeparation && userId ? `${key}_${userId}` : key;
  };

  const getStoredData = (userId?: number): Partial<T> => {
    try {
      const dataKey = getCacheKey(STORAGE_KEYS.DATA, userId);
      const timestampKey = getCacheKey(STORAGE_KEYS.TIMESTAMP, userId);

      const stored = sessionStorage.getItem(dataKey);
      const timestamp = sessionStorage.getItem(timestampKey);

      if (!stored || !timestamp) return {};

      // Check if cache is expired
      const age = Date.now() - parseInt(timestamp);
      if (age > expiryMs) {
        clearStoredData(userId);
        return {};
      }

      return JSON.parse(stored);
    } catch (error) {
      console.warn(`Failed to load stored ${keyPrefix} data:`, error);
      return {};
    }
  };

  const getStoredHasInitialized = (userId?: number): boolean => {
    try {
      const timestampKey = getCacheKey(STORAGE_KEYS.TIMESTAMP, userId);
      const timestamp = sessionStorage.getItem(timestampKey);

      if (!timestamp) return false;

      // Check if cache is expired
      const age = Date.now() - parseInt(timestamp);
      if (age > expiryMs) {
        clearStoredData(userId);
        return false;
      }

      const initKey = getCacheKey(STORAGE_KEYS.HAS_INITIALIZED, userId);
      return sessionStorage.getItem(initKey) === 'true';
    } catch (error) {
      return false;
    }
  };

  const storeData = (data: Partial<T>, userId?: number) => {
    try {
      const dataKey = getCacheKey(STORAGE_KEYS.DATA, userId);
      const initKey = getCacheKey(STORAGE_KEYS.HAS_INITIALIZED, userId);
      const timestampKey = getCacheKey(STORAGE_KEYS.TIMESTAMP, userId);

      sessionStorage.setItem(dataKey, JSON.stringify(data));
      sessionStorage.setItem(initKey, 'true');
      sessionStorage.setItem(timestampKey, Date.now().toString());
    } catch (error) {
      console.warn(`Failed to store ${keyPrefix} data:`, error);
    }
  };

  const clearStoredData = (userId?: number) => {
    try {
      const dataKey = getCacheKey(STORAGE_KEYS.DATA, userId);
      const initKey = getCacheKey(STORAGE_KEYS.HAS_INITIALIZED, userId);
      const timestampKey = getCacheKey(STORAGE_KEYS.TIMESTAMP, userId);

      sessionStorage.removeItem(dataKey);
      sessionStorage.removeItem(initKey);
      sessionStorage.removeItem(timestampKey);
    } catch (error) {
      console.warn(`Failed to clear stored ${keyPrefix} data:`, error);
    }
  };

  return {
    getStoredData,
    getStoredHasInitialized,
    storeData,
    clearStoredData,
  };
}

/**
 * Pre-configured cache utilities for common contexts
 */
export const CACHE_CONFIGS = {
  USER_DATA: {
    keyPrefix: 'user_data',
    expiryMs: 3 * 60 * 1000, // 3 minutes
    enableUserSeparation: true,
  },
  ACHIEVEMENTS: {
    keyPrefix: 'achievements',
    expiryMs: 5 * 60 * 1000, // 5 minutes
    enableUserSeparation: true,
  },
  ACTIVITIES: {
    keyPrefix: 'activities',
    expiryMs: 5 * 60 * 1000, // 5 minutes
    enableUserSeparation: false,
  },
  TIMELINE: {
    keyPrefix: 'timeline',
    expiryMs: 2 * 60 * 1000, // 2 minutes (more dynamic content)
    enableUserSeparation: false,
  },
  PREDICTIONS: {
    keyPrefix: 'predictions',
    expiryMs: 1 * 60 * 1000, // 1 minute (very dynamic)
    enableUserSeparation: false,
  },
} as const;
