// apps/client/src/hooks/usePredictionDiscovery.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePredictionMarket } from '../contexts/PredictionContext';
import { useAuth } from '../contexts/AuthContext';
import type { PredictionView } from '@ems/types';

export interface PredictionFilter {
  categories: number[]; // Changed from string[] to number[] (category IDs)
  difficulties: ('easy' | 'medium' | 'hard' | 'expert')[];
  timeRemaining: 'all' | '1h' | '1d' | '1w';
  activity: 'all' | 'high' | 'medium' | 'low';
  status: 'all' | 'open' | 'pending' | 'expired' | 'resolved';
  search: string;
  sortBy: 'relevance' | 'newest' | 'oldest' | 'odds' | 'volume' | 'activity';
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

const DIFFICULTY_THRESHOLDS = {
  easy: { minOdds: 1.2, maxOdds: 2.0 },
  medium: { minOdds: 2.0, maxOdds: 4.0 },
  hard: { minOdds: 4.0, maxOdds: 8.0 },
  expert: { minOdds: 8.0, maxOdds: 100.0 },
};

export function usePredictionDiscovery() {
  const { predictions, loading, error } = usePredictionMarket();
  const { user } = useAuth();

  const [filters, setFilters] = useState<PredictionFilter>({
    categories: [],
    difficulties: [],
    timeRemaining: 'all',
    activity: 'all',
    status: 'open',
    search: '',
    sortBy: 'relevance',
  });

  const [_viewedPredictions, setViewedPredictions] = useState<Set<number>>(new Set());
  const [userBettingHistory, setUserBettingHistory] = useState<string[]>([]);

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

  // Calculate difficulty based on prediction characteristics
  const calculateDifficulty = useCallback(
    (prediction: PredictionView): 'easy' | 'medium' | 'hard' | 'expert' => {
      if (!prediction.options || prediction.options.length === 0) return 'medium';

      // Find the most favorable odds (highest probability outcome)
      const bestOdds = Math.min(...prediction.options.map((opt) => opt.odds));

      for (const [difficulty, { minOdds, maxOdds }] of Object.entries(DIFFICULTY_THRESHOLDS)) {
        if (bestOdds >= minOdds && bestOdds < maxOdds) {
          return difficulty as 'easy' | 'medium' | 'hard' | 'expert';
        }
      }

      return 'medium';
    },
    [],
  );

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

      // Difficulty preference (assume users prefer medium difficulty)
      const difficulty = calculateDifficulty(prediction);
      if (difficulty === 'medium') {
        score += 10;
        reasons.push('Good difficulty level');
      } else if (difficulty === 'easy') {
        score += 5;
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
        difficulty,
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
    [userBettingHistory, calculateDifficulty],
  );

  // Filter predictions based on current filters
  const filteredPredictions = useMemo(() => {
    if (!predictions) return [];

    return predictions.filter((prediction) => {
      const now = Date.now();
      const expires = new Date(prediction.expiresAt).getTime();

      // Status filter logic
      if (filters.status !== 'all') {
        switch (filters.status) {
          case 'pending':
            if (prediction.status !== 'PENDING') return false;
            break;
          case 'open':
            if (prediction.status !== 'APPROVED' || now > expires) return false;
            break;
          case 'expired':
            if (
              prediction.status !== 'APPROVED' ||
              now <= expires ||
              prediction.resolvedAt !== null
            )
              return false;
            break;
          case 'resolved':
            if (prediction.resolvedAt === null) return false;
            break;
        }
      } else {
        // Default: show approved, non-resolved predictions that haven't expired (unless filtering by status)
        if (prediction.status === 'PENDING') {
          // Only show pending predictions if user is the creator
          if (prediction.creatorUserId !== user?.id) {
            return false;
          }
        }
      }

      // Category filter
      if (filters.categories.length > 0 && prediction.categoryId !== null) {
        if (!filters.categories.includes(prediction.categoryId)) {
          return false;
        }
      }

      // Difficulty filter
      if (filters.difficulties.length > 0) {
        const difficulty = calculateDifficulty(prediction);
        if (!filters.difficulties.includes(difficulty)) {
          return false;
        }
      }

      // Time remaining filter
      if (filters.timeRemaining !== 'all') {
        const timeLeft = expires - now;
        const hoursLeft = timeLeft / (1000 * 60 * 60);

        switch (filters.timeRemaining) {
          case '1h':
            if (hoursLeft > 1) return false;
            break;
          case '1d':
            if (hoursLeft > 24) return false;
            break;
          case '1w':
            if (hoursLeft > 168) return false;
            break;
        }
      }

      // Activity filter
      if (filters.activity !== 'all') {
        const totalActivity = prediction.bets?.length || 0;

        switch (filters.activity) {
          case 'high':
            if (totalActivity < 15) return false;
            break;
          case 'medium':
            if (totalActivity < 5 || totalActivity >= 15) return false;
            break;
          case 'low':
            if (totalActivity >= 5) return false;
            break;
        }
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const categoryStr = (
          prediction.category?.name || String(prediction.categoryId)
        ).toLowerCase();
        return (
          prediction.title.toLowerCase().includes(searchLower) ||
          categoryStr.includes(searchLower) ||
          prediction.description?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [predictions, filters, calculateDifficulty, user?.id]);

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

  // Get available filter options
  const availableCategories = useMemo(() => {
    const categoryMap = new Map();
    predictions?.forEach((p) => {
      if (p.category && !categoryMap.has(p.category.id)) {
        categoryMap.set(p.category.id, p.category);
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [predictions]);

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

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<PredictionFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      categories: [],
      difficulties: [],
      timeRemaining: 'all',
      activity: 'all',
      status: 'open',
      search: '',
      sortBy: 'relevance',
    });
  }, []);

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
