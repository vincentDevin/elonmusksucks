// apps/client/src/contexts/BookmarkContext.tsx
// Bulk bookmark checking context to prevent N+1 queries
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { timelineApi } from '../api/timeline';
import { useAuth } from './AuthContext';

interface BookmarkContextType {
  isBookmarked: (articleId: number) => boolean | undefined;
  requestBookmarkCheck: (articleId: number) => void;
  setBookmarked: (articleId: number, isBookmarked: boolean) => void;
  loading: boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

// Debounce delay for batching requests (ms)
const BATCH_DELAY_MS = 100;

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bookmarkMap, setBookmarkMap] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(false);

  // Queue of article IDs pending check
  const pendingChecksRef = useRef<Set<number>>(new Set());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Execute batch check for all pending article IDs
  const executeBatchCheck = useCallback(async () => {
    if (pendingChecksRef.current.size === 0 || !user) return;

    const articleIds = Array.from(pendingChecksRef.current);
    pendingChecksRef.current.clear();

    setLoading(true);
    try {
      const { bookmarks } = await timelineApi.checkBookmarkStatusBulk(articleIds);

      // Update bookmark map with results
      setBookmarkMap((prev) => {
        const newMap = new Map(prev);
        Object.entries(bookmarks).forEach(([id, isBookmarked]) => {
          newMap.set(parseInt(id), isBookmarked);
        });
        return newMap;
      });
    } catch (error) {
      console.error('Failed to check bookmark status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Request bookmark check for an article (will be batched)
  const requestBookmarkCheck = useCallback(
    (articleId: number) => {
      if (!user) return;

      // Skip if already checked
      if (bookmarkMap.has(articleId)) return;

      // Add to pending queue
      pendingChecksRef.current.add(articleId);

      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Schedule batch execution
      batchTimeoutRef.current = setTimeout(() => {
        executeBatchCheck();
      }, BATCH_DELAY_MS);
    },
    [user, bookmarkMap, executeBatchCheck],
  );

  // Get bookmark status for an article
  const isBookmarked = useCallback(
    (articleId: number): boolean | undefined => {
      return bookmarkMap.get(articleId);
    },
    [bookmarkMap],
  );

  // Manually set bookmark status (after toggle, for example)
  const setBookmarked = useCallback((articleId: number, isBookmarked: boolean) => {
    setBookmarkMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(articleId, isBookmarked);
      return newMap;
    });
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <BookmarkContext.Provider
      value={{ isBookmarked, requestBookmarkCheck, setBookmarked, loading }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within BookmarkProvider');
  }
  return context;
}
