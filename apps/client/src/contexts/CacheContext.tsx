import { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheContextValue {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T, ttl: number) => void;
  invalidate: (key: string | RegExp) => void;
  clear: () => void;
}

const CacheContext = createContext<CacheContextValue | null>(null);

/**
 * Lightweight cache provider using React built-in features
 * No external dependencies - just Context + useRef
 */
export function CacheProvider({ children }: { children: ReactNode }) {
  // Use ref instead of state to avoid re-renders on cache updates
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());

  const get = useCallback(<T,>(key: string): T | null => {
    const entry = cacheRef.current.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data as T;
  }, []);

  const set = useCallback(<T,>(key: string, data: T, ttl: number = 60000) => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    cacheRef.current.set(key, entry);
  }, []);

  const invalidate = useCallback((keyOrPattern: string | RegExp) => {
    if (typeof keyOrPattern === 'string') {
      // Invalidate single key
      cacheRef.current.delete(keyOrPattern);
    } else {
      // Invalidate by pattern (RegExp)
      const keys = Array.from(cacheRef.current.keys());
      keys.forEach((key) => {
        if (keyOrPattern.test(key)) {
          cacheRef.current.delete(key);
        }
      });
    }
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return (
    <CacheContext.Provider value={{ get, set, invalidate, clear }}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within CacheProvider');
  }
  return context;
}
