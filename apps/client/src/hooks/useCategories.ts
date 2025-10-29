import { getCategories, type Category } from '../api/predictions';
import { useCachedFetch } from './useCachedFetch';

/**
 * Fetch prediction categories with caching
 * Cache TTL: 10 minutes (categories rarely change)
 */
export function useCategories() {
  const { data, error, isLoading } = useCachedFetch<Category[]>(async () => await getCategories(), {
    cacheKey: 'prediction-categories',
    ttl: 600000, // 10 minutes - categories are very stable
  });

  return {
    categories: data || [],
    loading: isLoading,
    error,
  };
}
