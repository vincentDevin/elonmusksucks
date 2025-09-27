import { useState, useMemo, useRef, useEffect } from 'react';
import { usePredictionMarket } from '../../contexts/PredictionContext';
import PredictionCard from './PredictionCard';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

export default function PredictionFeed() {
  const { predictions, loading, error } = usePredictionMarket();
  const [sortBy, setSortBy] = useState('newest');
  const [filterByCategory, setFilterByCategory] = useState('all');
  const observerRef = useRef(null);

  const sortedAndFilteredPredictions = useMemo(() => {
    let filtered = predictions.filter((p) => {
      const now = Date.now();
      const expires = new Date(p.expiresAt).getTime();
      return p.status === 'APPROVED' && now <= expires;
    });

    if (filterByCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === filterByCategory);
    }

    if (sortBy === 'newest') {
      return filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sortBy === 'endingSoon') {
      return filtered.sort(
        (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
      );
    }

    return filtered;
  }, [predictions, sortBy, filterByCategory]);

  const { items, hasMore, loadMore } = useInfiniteScroll(sortedAndFilteredPredictions, 10);

  useEffect(() => {
    const currentObserverRef = observerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 1.0 },
    );

    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [hasMore, loadMore]);

  if (loading && predictions.length === 0) return <p>Loading…</p>;
  if (error) return <p className="text-red-500">Error: {String(error)}</p>;

  return (
    <section className="bg-surface border border-muted rounded-2xl p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-content">Prediction Feed</h2>
        <div className="flex gap-2">
          <select
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-background border border-muted rounded-md px-2 py-1 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="endingSoon">Ending Soon</option>
          </select>
          <select
            onChange={(e) => setFilterByCategory(e.target.value)}
            className="bg-background border border-muted rounded-md px-2 py-1 text-sm"
          >
            <option value="all">All Categories</option>
            {[...new Set(predictions.map((p) => p.category))].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-tertiary">
          <div className="text-4xl mb-2">📊</div>
          <p>No open predictions available</p>
        </div>
      ) : (
        <div className="space-y-4 pr-2">
          {items.map((p) => (
            <PredictionCard
              key={p.id}
              prediction={p}
              variant="compact"
              showParlayActions={true}
              showBetsList={false}
              hideInlineParlaySelector={true}
            />
          ))}
          {hasMore && (
            <div ref={observerRef} className="text-center">
              <button onClick={loadMore} className="text-primary hover:underline">
                Loading more...
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
