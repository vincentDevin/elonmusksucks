import { useMemo, useCallback } from 'react';
import { usePredictionMarket } from '../../contexts/PredictionContext';
import PredictionCard from './PredictionCard';
import GenericFeed from '../GenericFeed';
import type { FeedResponse, FeedTab, FeedFilter } from '../GenericFeed';

export default function PredictionFeed() {
  const { predictions } = usePredictionMarket();

  // Create tabs for different sort options
  const tabs: FeedTab[] = [
    { id: 'newest', label: 'Newest', icon: '🆕', count: predictions.length },
    { id: 'endingSoon', label: 'Ending Soon', icon: '⏰', count: predictions.length },
  ];

  // Create filters for categories
  const categories = useMemo(() => {
    // Get unique categories (by ID) from predictions
    const categoryMap = new Map();
    predictions.forEach((p) => {
      if (p.category && !categoryMap.has(p.category.id)) {
        categoryMap.set(p.category.id, p.category);
      }
    });
    return Array.from(categoryMap.values());
  }, [predictions]);

  const filters: FeedFilter[] = categories.map((category) => ({
    id: String(category.id),
    label: `${category.icon || ''} ${category.name}`.trim(),
    value: String(category.id),
    active: false,
  }));

  // Fetch function that works with the context data
  const fetchPredictions = useCallback(
    async ({
      cursor,
      limit = 10,
      tab = 'newest',
      filters: activeFilters = {},
    }: {
      cursor?: string;
      limit?: number;
      tab?: string;
      filters?: Record<string, any>;
    }): Promise<FeedResponse<any>> => {
      // Filter predictions
      let filtered = predictions.filter((p) => {
        const now = Date.now();
        const expires = new Date(p.expiresAt).getTime();
        return p.status === 'APPROVED' && now <= expires;
      });

      // Apply category filters
      const activeCategories = Object.keys(activeFilters);
      if (activeCategories.length > 0) {
        filtered = filtered.filter((p) => activeCategories.includes(String(p.categoryId)));
      }

      // Apply sorting based on tab
      if (tab === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (tab === 'endingSoon') {
        filtered.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
      }

      // Simulate pagination with cursor
      const startIndex = cursor ? parseInt(cursor) : 0;
      const endIndex = startIndex + limit;
      const items = filtered.slice(startIndex, endIndex);
      const hasMore = endIndex < filtered.length;

      return {
        items,
        pagination: {
          hasMore,
          cursor: hasMore ? endIndex.toString() : undefined,
        },
      };
    },
    [predictions],
  );

  return (
    <section className="bg-surface border border-muted rounded-2xl p-4 shadow-lg">
      <h2 className="text-xl font-bold text-content mb-4">📊 Prediction Feed</h2>

      <GenericFeed
        fetchItems={fetchPredictions}
        renderItem={(prediction) => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            variant="compact"
            showParlayActions={true}
            showBetsList={false}
            hideInlineParlaySelector={true}
          />
        )}
        tabs={tabs}
        initialTab="newest"
        filters={filters}
        variant="list"
        spacing="normal"
        enableInfiniteScroll={true}
        emptyComponent={
          <div className="text-center py-8 text-tertiary">
            <div className="text-4xl mb-2">📊</div>
            <p>No open predictions available</p>
          </div>
        }
      />
    </section>
  );
}
