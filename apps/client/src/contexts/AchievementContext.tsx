// apps/client/src/contexts/AchievementContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

interface Achievement {
  id: string;
  achievementId: number;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity?: string;
  progress: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

interface RecentAchievement {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity: string;
  iconUrl?: string | null;
  completedAt: string;
}

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
      const [achievementsRes, recentRes, allRes] = await Promise.all([
        api.get(`/api/users/${user.id}/achievements`),
        api.get(`/api/users/${user.id}/achievements/recent?limit=5`),
        api.get('/api/users/achievements/all'),
      ]);

      setAchievements(achievementsRes.data || []);
      setRecentAchievements(recentRes.data || []);
      setAllAchievements(allRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch achievements:', err);
      setError(err.message || 'Failed to load achievements');
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
