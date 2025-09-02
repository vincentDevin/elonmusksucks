import { useState, useCallback } from 'react';
import type { ReactionType, PostReaction } from '@ems/types';
import api from '../api/axios';

interface ReactionState {
  counts: Record<ReactionType, number>;
  userReaction?: ReactionType;
  loading: boolean;
  error?: string;
}

interface UseReactionsReturn extends ReactionState {
  toggleReaction: (type: ReactionType) => Promise<void>;
  fetchReactions: (postId: number) => Promise<PostReaction[]>;
  clearError: () => void;
}

const DEFAULT_COUNTS: Record<ReactionType, number> = {
  LIKE: 0,
  LOVE: 0,
  LAUGH: 0,
  WOW: 0,
  SAD: 0,
  ANGRY: 0,
};

export function useReactions(
  postId: number,
  initialCounts?: Record<ReactionType, number>,
  initialUserReaction?: ReactionType,
): UseReactionsReturn {
  const [state, setState] = useState<ReactionState>({
    counts: initialCounts || DEFAULT_COUNTS,
    userReaction: initialUserReaction,
    loading: false,
    error: undefined,
  });

  const toggleReaction = useCallback(
    async (type: ReactionType) => {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      try {
        const response = await api.post(`/api/posts/${postId}/reactions`, { type });
        const result = response.data;

        setState((prev) => ({
          ...prev,
          counts: result.counts,
          userReaction: result.action === 'removed' ? undefined : type,
          loading: false,
        }));
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.response?.data?.error || error.message || 'Failed to toggle reaction',
        }));
      }
    },
    [postId],
  );

  const fetchReactions = useCallback(async (postId: number): Promise<PostReaction[]> => {
    try {
      const response = await api.get(`/api/posts/${postId}/reactions`);
      const result = response.data;
      return result.reactions || [];
    } catch (error) {
      console.error('Error fetching reactions:', error);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: undefined }));
  }, []);

  return {
    ...state,
    toggleReaction,
    fetchReactions,
    clearError,
  };
}

// Hook for fetching reaction counts only (public endpoint)
export function useReactionCounts(postId: number) {
  const [counts, setCounts] = useState<Record<ReactionType, number>>(DEFAULT_COUNTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await api.get(`/api/posts/${postId}/reactions/counts`);
      setCounts(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to fetch reaction counts');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  return {
    counts,
    loading,
    error,
    fetchCounts,
    clearError: () => setError(undefined),
  };
}
