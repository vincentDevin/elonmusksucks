// apps/client/src/contexts/AchievementContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
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

  // Actions
  refreshAchievements: () => Promise<void>;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

interface AchievementProviderProps {
  children: ReactNode;
}

export function AchievementProvider({ children }: AchievementProviderProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = async () => {
    if (!user?.id) return;

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
    } finally {
      setLoading(false);
    }
  };

  // Load achievements when user changes
  useEffect(() => {
    if (user?.id) {
      fetchAchievements();
    } else {
      // Clear data when user logs out
      setAchievements([]);
      setRecentAchievements([]);
      setAllAchievements([]);
    }
  }, [user?.id]);

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
