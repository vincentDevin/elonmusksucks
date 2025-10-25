// apps/client/src/hooks/usePredictionDiscovery.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePredictionMarket } from '../contexts/PredictionContext';
import { useAuth } from '../contexts/AuthContext';
import type { PredictionView } from '@ems/types';
import { getCategories, type Category } from '../api/predictions';

export interface PredictionFilter {
  categories: number[]; // Category IDs
  timeRemaining: 'all' | '1h' | '1d' | '1w';
  status: 'all' | 'open' | 'pending' | 'expired' | 'resolved';
  search: string;
}

export interface PredictionRecommendation {
  score: number;
  reasons: string[];
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  socialProof: {
    popularityScore: number;
    bettingVelocity: number;
    controversyLevel: number;
  };
  timing: {
    urgency: 'low' | 'medium' | 'high';
    timeRemaining: number;
  };
}

export interface EnhancedPrediction extends Omit<PredictionView, 'options'> {
  recommendation?: PredictionRecommendation;
  section: 'trending' | 'ending_soon' | 'personalized' | 'hot' | 'all';
  isNew?: boolean;
  // Computed properties for compatibility with PredictionFull
  resolved: boolean;
  approved: boolean;
  creatorId: number;
  // Override options to include createdAt for PredictionFull compatibility
  options: Array<{
    id: number;
    label: string;
    odds: number;
    predictionId: number;
    createdAt: string;
  }>;
}

export interface PredictionSection {
  id: string;
  title: string;
  icon: string;
  predictions: EnhancedPrediction[];
  count: number;
}

export function usePredictionDiscovery() {
  const {
    predictions,
    loading,
    error,
    filters: contextFilters,
    updateFilters: contextUpdateFilters,
    clearFilters: contextClearFilters,
  } = usePredictionMarket();
  const { user } = useAuth();

  // Expose context filters directly
  const filters: PredictionFilter = {
    categories: contextFilters.categoryId !== undefined ? [contextFilters.categoryId] : [],
    timeRemaining: contextFilters.timeRemaining || 'all',
    status: contextFilters.status,
    search: contextFilters.search,
  };

  const [_viewedPredictions, setViewedPredictions] = useState<Set<number>>(new Set());
  const [userBettingHistory, setUserBettingHistory] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Load user preferences
  useEffect(() => {
    if (user?.id) {
      // Load viewed predictions
      const savedViewed = localStorage.getItem(`viewed_${user.id}`);
      if (savedViewed) {
        setViewedPredictions(new Set(JSON.parse(savedViewed)));
      }

      // Load betting history categories for personalization
      const savedHistory = localStorage.getItem(`betting_history_${user.id}`);
      if (savedHistory) {
        setUserBettingHistory(JSON.parse(savedHistory));
      }
    }
  }, [user?.id]);

  // Fetch all categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('[usePredictionDiscovery] Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Calculate recommendation score for personalization
  const calculateRecommendationScore = useCallback(
    (prediction: PredictionView): PredictionRecommendation => {
      let score = 0;
      const reasons: string[] = [];

      // Category preference scoring (using category name if available, otherwise categoryId)
      const categoryIdentifier = prediction.category?.name || String(prediction.categoryId);
      if (userBettingHistory.includes(categoryIdentifier)) {
        score += 30;
        reasons.push(`You often bet on ${categoryIdentifier}`);
      }

      // Activity level scoring (PredictionView doesn't have parlayLegs)
      const betCount = prediction.bets?.length || 0;
      const totalActivity = betCount;

      let popularityScore = 0;
      let bettingVelocity = 0;

      if (totalActivity > 20) {
        score += 20;
        popularityScore = 90;
        bettingVelocity = 85;
        reasons.push('High betting activity');
      } else if (totalActivity > 10) {
        score += 15;
        popularityScore = 70;
        bettingVelocity = 65;
        reasons.push('Good betting activity');
      } else if (totalActivity > 5) {
        score += 10;
        popularityScore = 50;
        bettingVelocity = 45;
      } else {
        popularityScore = 20;
        bettingVelocity = 15;
      }

      // Time sensitivity scoring
      const now = Date.now();
      const expires = new Date(prediction.expiresAt).getTime();
      const timeLeft = expires - now;
      const hoursLeft = timeLeft / (1000 * 60 * 60);

      let urgency: 'low' | 'medium' | 'high' = 'low';

      if (hoursLeft <= 2) {
        score += 25;
        urgency = 'high';
        reasons.push('Ending soon!');
      } else if (hoursLeft <= 24) {
        score += 15;
        urgency = 'medium';
        reasons.push('Ending today');
      } else if (hoursLeft <= 168) {
        // 1 week
        score += 5;
        urgency = 'low';
      }

      // Hot market bonus
      if ((prediction as any).hotMarket) {
        score += 15;
        reasons.push('Hot market with changing odds');
      }

      // Controversy scoring (high variance in options)
      let controversyLevel = 0;
      if (prediction.options && prediction.options.length >= 2) {
        const odds = prediction.options.map((opt) => opt.odds);
        const variance = odds.reduce((acc, odd) => acc + Math.pow(odd - 2.0, 2), 0) / odds.length;
        controversyLevel = Math.min(100, variance * 20);

        if (controversyLevel > 50) {
          score += 10;
          reasons.push('Controversial topic');
        }
      }

      // New prediction bonus
      const createdHoursAgo = (now - new Date(prediction.createdAt).getTime()) / (1000 * 60 * 60);
      if (createdHoursAgo <= 2) {
        score += 20;
        reasons.push('Fresh prediction');
      } else if (createdHoursAgo <= 24) {
        score += 10;
        reasons.push('Recent prediction');
      }

      return {
        score: Math.min(100, score),
        reasons: reasons.slice(0, 3), // Limit to top 3 reasons
        category: categoryIdentifier,
        difficulty: 'medium' as const, // Default difficulty (no longer calculated)
        socialProof: {
          popularityScore,
          bettingVelocity,
          controversyLevel,
        },
        timing: {
          urgency,
          timeRemaining: Math.max(0, timeLeft),
        },
      };
    },
    [userBettingHistory],
  );

  // All filtering now happens server-side - no client-side filtering needed
  const filteredPredictions = useMemo(() => {
    return predictions || [];
  }, [predictions]);

  // Enhance predictions with recommendations and metadata
  const enhancedPredictions = useMemo((): EnhancedPrediction[] => {
    return filteredPredictions.map((prediction) => {
      const recommendation = calculateRecommendationScore(prediction);
      const now = Date.now();
      const createdHoursAgo = (now - new Date(prediction.createdAt).getTime()) / (1000 * 60 * 60);
      const timeLeft = new Date(prediction.expiresAt).getTime() - now;
      const hoursLeft = timeLeft / (1000 * 60 * 60);

      // Determine section based on characteristics
      let section: EnhancedPrediction['section'] = 'all';

      if (recommendation.score >= 70) {
        section = 'personalized';
      } else if (hoursLeft <= 6) {
        section = 'ending_soon';
      } else if (recommendation.socialProof.popularityScore >= 70) {
        section = 'hot';
      } else if (recommendation.socialProof.bettingVelocity >= 80) {
        section = 'trending';
      }

      return {
        ...prediction,
        recommendation,
        section,
        isNew: createdHoursAgo <= 2,
        // Computed properties for compatibility with PredictionFull
        resolved: prediction.resolvedAt !== null,
        approved: prediction.status === 'APPROVED' || prediction.status === 'RESOLVED',
        creatorId: prediction.creatorUserId,
        // Add createdAt to options for PredictionFull compatibility
        options: prediction.options.map((opt) => ({
          ...opt,
          createdAt: prediction.createdAt, // Use prediction's createdAt as fallback
        })),
      };
    });
  }, [filteredPredictions, calculateRecommendationScore]);

  // Organize predictions into sections
  const predictionSections = useMemo((): PredictionSection[] => {
    const sections: Record<string, EnhancedPrediction[]> = {
      personalized: [],
      trending: [],
      hot: [],
      ending_soon: [],
      all: enhancedPredictions,
    };

    enhancedPredictions.forEach((prediction) => {
      if (prediction.section !== 'all') {
        sections[prediction.section].push(prediction);
      }
    });

    // Sort sections by recommendation score
    Object.keys(sections).forEach((key) => {
      if (key !== 'all') {
        sections[key].sort(
          (a, b) => (b.recommendation?.score || 0) - (a.recommendation?.score || 0),
        );
      }
    });

    // Sort 'all' by a combination of factors
    sections.all.sort((a, b) => {
      const scoreA = (a.recommendation?.score || 0) + (a.isNew ? 10 : 0);
      const scoreB = (b.recommendation?.score || 0) + (b.isNew ? 10 : 0);
      return scoreB - scoreA;
    });

    return [
      {
        id: 'personalized',
        title: 'For You',
        icon: '🎯',
        predictions: sections.personalized.slice(0, 5),
        count: sections.personalized.length,
      },
      {
        id: 'trending',
        title: 'Trending',
        icon: '📈',
        predictions: sections.trending.slice(0, 5),
        count: sections.trending.length,
      },
      {
        id: 'ending_soon',
        title: 'Ending Soon',
        icon: '⏰',
        predictions: sections.ending_soon.slice(0, 5),
        count: sections.ending_soon.length,
      },
      {
        id: 'hot',
        title: 'Hot Right Now',
        icon: '🔥',
        predictions: sections.hot.slice(0, 5),
        count: sections.hot.length,
      },
      {
        id: 'all',
        title: 'All Predictions',
        icon: '📊',
        predictions: sections.all,
        count: sections.all.length,
      },
    ].filter((section) => section.count > 0);
  }, [enhancedPredictions]);

  // Get available filter options - use fetched categories instead of deriving from predictions
  const availableCategories = useMemo(() => {
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories]);

  // Mark prediction as viewed
  const markAsViewed = useCallback(
    (predictionId: number) => {
      setViewedPredictions((prev: Set<number>) => {
        const newViewed = new Set(prev);
        newViewed.add(predictionId);

        if (user?.id) {
          localStorage.setItem(`viewed_${user.id}`, JSON.stringify(Array.from(newViewed)));
        }

        return newViewed;
      });
    },
    [user?.id],
  );

  // Update filters - all server-side now
  const updateFilters = useCallback(
    (newFilters: Partial<PredictionFilter>) => {
      const serverFilters: any = {};

      if (newFilters.categories !== undefined) {
        serverFilters.categoryId = newFilters.categories[0] || undefined;
      }
      if (newFilters.timeRemaining !== undefined) {
        serverFilters.timeRemaining =
          newFilters.timeRemaining === 'all' ? undefined : newFilters.timeRemaining;
      }
      if (newFilters.status !== undefined) {
        serverFilters.status = newFilters.status;
      }
      if (newFilters.search !== undefined) {
        serverFilters.search = newFilters.search;
      }

      // Update context filters
      if (Object.keys(serverFilters).length > 0) {
        contextUpdateFilters(serverFilters);
      }
    },
    [contextUpdateFilters],
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    contextClearFilters();
  }, [contextClearFilters]);

  return {
    predictionSections,
    enhancedPredictions,
    filters,
    availableCategories,
    loading,
    error,
    updateFilters,
    clearFilters,
    markAsViewed,
  };
}
