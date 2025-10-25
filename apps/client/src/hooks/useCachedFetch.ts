import { useState, useEffect, useRef, useCallback } from 'react';
import { useCache } from '../contexts/CacheContext';

interface UseCachedFetchOptions {
  cacheKey: string;
  ttl?: number; // Cache TTL in milliseconds (default: 60s)
  enabled?: boolean; // Enable/disable fetching (default: true)
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseCachedFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for cached data fetching
 * Uses CacheContext to store and retrieve cached responses
 *
 * @example
 * const { data, isLoading, refetch } = useCachedFetch(
 *   () => axios.get('/api/predictions'),
 *   { cacheKey: 'predictions-list', ttl: 60000 }
 * );
 */
export function useCachedFetch<T>(
  fetcher: () => Promise<T>,
  options: UseCachedFetchOptions,
): UseCachedFetchResult<T> {
  const {
    cacheKey,
    ttl = 60000, // Default 60 seconds
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const cache = useCache();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);

  // Update fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!enabled) return;

      // Check cache first (unless skipCache is true)
      if (!skipCache) {
        const cachedData = cache.get<T>(cacheKey);
        if (cachedData !== null) {
          setData(cachedData);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      // Fetch fresh data
      setIsFetching(true);
      setError(null);

      try {
        const freshData = await fetcherRef.current();

        if (!isMountedRef.current) return;

        // Update cache
        cache.set(cacheKey, freshData, ttl);

        // Update state
        setData(freshData);
        setError(null);
        setIsLoading(false);

        // Call onSuccess callback
        if (onSuccess) {
          onSuccess(freshData);
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        setIsLoading(false);

        // Call onError callback
        if (onError) {
          onError(error);
        }

        console.error(`[useCachedFetch] Error fetching ${cacheKey}:`, error);
      } finally {
        if (isMountedRef.current) {
          setIsFetching(false);
        }
      }
    },
    [enabled, cache, cacheKey, ttl, onSuccess, onError],
  );

  // Refetch function (bypasses cache)
  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  };
}
