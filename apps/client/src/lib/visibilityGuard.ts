// Rollback: Delete this file and remove visibility guard imports
import { useCallback, useRef, useEffect } from 'react';

export function useVisibilityGuard(staleTTL: number = 5 * 60 * 1000) {
  const lastFetchRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(document.visibilityState === 'visible');

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const shouldRefresh = useCallback(() => {
    if (!isVisibleRef.current) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;

    // Always refresh if no previous fetch or data is stale
    return lastFetchRef.current === 0 || timeSinceLastFetch > staleTTL;
  }, [staleTTL]);

  const updateLastFetch = useCallback(() => {
    lastFetchRef.current = Date.now();
  }, []);

  return {
    shouldRefresh,
    updateLastFetch,
  };
}
