import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';

interface PongEloCardProps {
  userId: number;
  eloRating?: number;
  tier?: string;
  peakElo?: number;
  lastEloChange?: number;
  showDetails?: boolean;
  className?: string;
}

const TIER_COLORS = {
  BRONZE: 'bg-orange-100 text-orange-800 border-orange-200',
  SILVER: 'bg-gray-100 text-gray-800 border-gray-200',
  GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PLATINUM: 'bg-green-100 text-green-800 border-green-200',
  DIAMOND: 'bg-blue-100 text-blue-800 border-blue-200',
  MASTER: 'bg-red-100 text-red-800 border-red-200',
  GRANDMASTER: 'bg-purple-100 text-purple-800 border-purple-200',
};

const TIER_REQUIREMENTS = {
  BRONZE: { min: 400, max: 999 },
  SILVER: { min: 1000, max: 1399 },
  GOLD: { min: 1400, max: 1799 },
  PLATINUM: { min: 1800, max: 2199 },
  DIAMOND: { min: 2200, max: 2599 },
  MASTER: { min: 2600, max: 2999 },
  GRANDMASTER: { min: 3000, max: 10000 },
};

export default function PongEloCard({
  userId,
  eloRating = 1200,
  tier = 'SILVER',
  peakElo = 1200,
  lastEloChange = 0,
  showDetails = true,
  className = '',
}: PongEloCardProps) {
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch detailed user stats if needed
  useEffect(() => {
    if (showDetails && userId) {
      const fetchStats = async () => {
        setLoading(true);
        try {
          const response = await api.get(`/api/users/${userId}/pong-stats`);
          setUserStats(response.data);
        } catch (error) {
          console.error('Failed to fetch Pong stats:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchStats();
    }
  }, [userId, showDetails]);

  const tierData = TIER_REQUIREMENTS[tier as keyof typeof TIER_REQUIREMENTS];
  const progressToNextTier =
    tierData && tier !== 'GRANDMASTER'
      ? ((eloRating - tierData.min) / (tierData.max - tierData.min)) * 100
      : 100;

  const nextTierName =
    tier === 'BRONZE'
      ? 'SILVER'
      : tier === 'SILVER'
        ? 'GOLD'
        : tier === 'GOLD'
          ? 'PLATINUM'
          : tier === 'PLATINUM'
            ? 'DIAMOND'
            : tier === 'DIAMOND'
              ? 'MASTER'
              : tier === 'MASTER'
                ? 'GRANDMASTER'
                : null;

  const pointsToNextTier = nextTierName && tierData ? tierData.max + 1 - eloRating : 0;

  return (
    <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <TrophyIcon className="w-6 h-6 text-blue-500" />
          <span className="font-semibold text-content">Elo Rating</span>
        </div>
        {lastEloChange !== 0 && (
          <div
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium ${
              lastEloChange > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {lastEloChange > 0 ? (
              <ArrowTrendingUpIcon className="w-4 h-4" />
            ) : (
              <ArrowTrendingDownIcon className="w-4 h-4" />
            )}
            <span>
              {lastEloChange > 0 ? '+' : ''}
              {lastEloChange}
            </span>
          </div>
        )}
      </div>

      {/* Main Elo Display */}
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-blue-500 mb-2">{eloRating.toLocaleString()}</div>
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${
            TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.SILVER
          }`}
        >
          {tier}
        </div>
      </div>

      {/* Progress to Next Tier */}
      {nextTierName && tier !== 'GRANDMASTER' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-tertiary mb-1">
            <span>Progress to {nextTierName}</span>
            <span>{pointsToNextTier} points needed</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progressToNextTier, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Peak Elo */}
      {peakElo > eloRating && (
        <div className="flex items-center justify-between py-2 border-t border-accent/20">
          <span className="text-sm text-tertiary">Peak Rating</span>
          <span className="text-sm font-medium text-content">{peakElo.toLocaleString()}</span>
        </div>
      )}

      {/* Detailed Stats */}
      {showDetails && userStats && !loading && (
        <div className="mt-4 pt-4 border-t border-accent/20 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-tertiary">Total Matches</span>
            <span className="font-medium text-content">{userStats.totalMatches}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-tertiary">Win Rate</span>
            <span className="font-medium text-content">{userStats.winRate?.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-tertiary">Current Streak</span>
            <span className="font-medium text-content">{userStats.winStreak}</span>
          </div>
          {userStats.riskTaker && (
            <div className="flex items-center justify-center pt-2">
              <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                🎲 High Roller
              </span>
            </div>
          )}
        </div>
      )}

      {loading && showDetails && (
        <div className="mt-4 pt-4 border-t border-accent/20 text-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      )}
    </div>
  );
}
