import { useState, useMemo, useCallback } from 'react';

export function useInfiniteScroll<T>(items: T[], pageSize: number = 10) {
  const [page, setPage] = useState(1);

  const paginatedItems = useMemo(() => {
    return items.slice(0, page * pageSize);
  }, [items, page, pageSize]);

  const hasMore = useMemo(() => {
    return paginatedItems.length < items.length;
  }, [paginatedItems, items]);

  const loadMore = useCallback(() => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore]);

  return {
    items: paginatedItems,
    hasMore,
    loadMore,
  };
}
