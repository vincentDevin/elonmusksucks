// AchievementContext with hydration guard to prevent redundant API calls on navigation
// PERFORMANCE FIX: Prevents /api/users/{id}/achievements API call on every mount
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useEventBusCore } from './EventBusCoreContext';
import api from '../api/axios';
import {
  transformAchievementArray,
  transformRecentAchievementData,
} from '../utils/achievementDataTransform';
import type {
  ApiAchievementData,
  ComponentAchievement,
  ComponentRecentAchievement,
} from '../utils/achievementDataTransform';
import { REDIS_CHANNELS, type AchievementUnlockedPayload } from '@ems/types';
import { refetchLogger, RefetchReasons } from '../lib/refetchLogger';

// Use the standardized interfaces from the transformation utility
type Achievement = ComponentAchievement;
type RecentAchievement = ComponentRecentAchievement;

interface AchievementContextType {
  // Achievement data
  achievements: Achievement[];
  recentAchievements: RecentAchievement[];
  allAchievements: Achievement[];

  // Computed stats
  totalBadges: number;
  totalAvailable: number;
  completionRate: number;

  // Loading states
  loading: boolean;
  error: string | null;
  isHydrated: boolean;

  // Actions
  refreshAchievements: () => Promise<void>;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

interface AchievementProviderProps {
  children: ReactNode;
}

export function AchievementProvider({ children }: AchievementProviderProps) {
  const { user } = useAuth();
  const { subscribe } = useEventBusCore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const fetchAchievements = async (reason: string = RefetchReasons.MANUAL_REFRESH) => {
    if (!user?.id) return;

    // Log the refetch for debugging
    refetchLogger.log({
      context: 'AchievementContext',
      endpoint: '/api/users/{id}/achievements',
      reason,
      userId: user.id,
      metadata: {
        isHydrated,
        achievementsCount: achievements.length,
        recentCount: recentAchievements.length,
      },
    });

    setLoading(true);
    setError(null);

    try {
      // Main user achievements endpoint (this exists and returns UserAchievementProgressView[])
      const achievementsRes = await api.get(`/api/users/${user.id}/achievements`);
      const apiAchievements: ApiAchievementData[] = achievementsRes.data || [];
      console.log(apiAchievements);
      // Transform API data to component format
      const transformedAchievements = transformAchievementArray(apiAchievements);
      setAchievements(transformedAchievements);

      // For recent achievements, filter completed ones from main achievements and sort by completion date
      const completedAchievements = apiAchievements
        .filter((a) => a.isCompleted && a.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
        .slice(0, 5); // Get the 5 most recent

      const transformedRecent = completedAchievements.map(transformRecentAchievementData);
      setRecentAchievements(transformedRecent);

      // All achievements is the same as user achievements (since we get progress for all)
      setAllAchievements(transformedAchievements);
      setIsHydrated(true);
    } catch (err: any) {
      console.error('Failed to fetch achievements:', err);

      // Provide more specific error messages
      if (err.response?.status === 404) {
        setError('Achievement data not found. Please try refreshing the page.');
      } else if (err.response?.status === 403) {
        setError('Unable to access achievement data. Please log in again.');
      } else {
        setError(err.message || 'Failed to load achievements');
      }
      setIsHydrated(false);
    } finally {
      setLoading(false);
    }
  };

  // Load achievements when user changes
  useEffect(() => {
    if (user?.id) {
      // Hydration guard: prevent refetches if already hydrated for this user
      if (isHydrated) {
        return; // Skip refetch - already have data for this user
      }
      fetchAchievements(RefetchReasons.HYDRATION_GUARD);
    } else {
      // Clear data when user logs out
      setAchievements([]);
      setRecentAchievements([]);
      setAllAchievements([]);
      setIsHydrated(false);
    }
  }, [user?.id, isHydrated]);

  // Reset hydration state when user changes
  useEffect(() => {
    setIsHydrated(false);
  }, [user?.id]);

  // Real-time achievement unlock notifications
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribe(
      REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED,
      (payload: AchievementUnlockedPayload) => {
        // Only process if this achievement is for the current user
        if (payload.userId !== user.id) return;

        console.log('[AchievementContext] Achievement unlocked:', payload.achievement.title);

        // Transform the unlocked achievement data to component format
        const newAchievement: Achievement = {
          id: payload.achievement.id,
          achievementId: parseInt(payload.achievement.id), // Assumes string ID converts to number
          name: payload.achievement.id, // Use ID as name for now (should come from API)
          title: payload.achievement.title,
          description: payload.achievement.description,
          category: payload.achievement.category,
          rarity: 'common', // Default rarity (should come from API payload)
          isCompleted: true,
          completedAt: new Date().toISOString(),
          progress: payload.progress.current,
          targetValue: payload.progress.current, // Since it's unlocked, current = target
          iconUrl: null, // No icon in unlock payload
        };

        // Update achievements list with the newly unlocked achievement
        setAchievements((prev) => {
          const existingIndex = prev.findIndex((a) => a.id === newAchievement.id);
          if (existingIndex >= 0) {
            // Update existing achievement
            const updated = [...prev];
            updated[existingIndex] = newAchievement;
            return updated;
          } else {
            // Add new achievement
            return [...prev, newAchievement];
          }
        });

        // Update allAchievements as well
        setAllAchievements((prev) => {
          const existingIndex = prev.findIndex((a) => a.id === newAchievement.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newAchievement;
            return updated;
          } else {
            return [...prev, newAchievement];
          }
        });

        // Add to recent achievements (prepend to beginning, keep latest 5)
        const recentAchievement: RecentAchievement = {
          id: payload.achievement.id,
          name: payload.achievement.id, // Use ID as name for now
          title: payload.achievement.title,
          description: payload.achievement.description,
          category: payload.achievement.category,
          rarity: 'common', // Default rarity
          iconUrl: null,
          completedAt: new Date().toISOString(),
        };

        setRecentAchievements((prev) => [recentAchievement, ...prev.slice(0, 4)]);
      },
      { priority: 'high' }, // High priority for instant user feedback
    );

    return unsubscribe;
  }, [user?.id, subscribe]);

  // Computed values
  const totalBadges = achievements.filter((a) => a.isCompleted).length;
  const totalAvailable = allAchievements.length;
  const completionRate = totalAvailable > 0 ? totalBadges / totalAvailable : 0;

  const value: AchievementContextType = {
    achievements,
    recentAchievements,
    allAchievements,
    totalBadges,
    totalAvailable,
    completionRate,
    loading,
    error,
    isHydrated,
    refreshAchievements: fetchAchievements,
  };

  return <AchievementContext.Provider value={value}>{children}</AchievementContext.Provider>;
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (context === undefined) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
}
