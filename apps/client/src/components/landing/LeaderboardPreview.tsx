import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTopAllTime } from '../../api/leaderboard';
import type { PublicLeaderboardEntry } from '@ems/types';

interface LeaderboardPreviewProps {
  className?: string;
  limit?: number;
}

export const LeaderboardPreview: React.FC<LeaderboardPreviewProps> = ({
  className = '',
  limit = 5,
}) => {
  const [leaders, setLeaders] = useState<PublicLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopLeaders();
  }, [limit]);

  const fetchTopLeaders = async () => {
    try {
      setLoading(true);
      const data = await getTopAllTime(limit);
      // Ensure data is an array
      const leaderArray = Array.isArray(data) ? data : [];
      setLeaders(leaderArray);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard');
      // Set fallback data
      setLeaders([
        {
          rank: 1,
          userId: 1,
          username: 'MuskTracker2024',
          displayName: 'Musk Tracker',
          totalProfit: 45650,
          winRate: 0.72,
          totalBets: 156,
          volumeTraded: 123500,
          roi: 0.45,
        },
        {
          rank: 2,
          userId: 2,
          username: 'TeslaBear',
          displayName: 'Tesla Bear',
          totalProfit: 38200,
          winRate: 0.68,
          totalBets: 142,
          volumeTraded: 98400,
          roi: 0.42,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatMuskBucks = (amount: number | bigint | undefined | null) => {
    if (amount == null || amount === undefined) {
      return '0';
    }

    // Convert BigInt to number for formatting
    const numAmount = typeof amount === 'bigint' ? Number(amount) : amount;

    if (numAmount >= 1000000) {
      return `${(numAmount / 1000000).toFixed(1)}M`;
    }
    if (numAmount >= 1000) {
      return `${(numAmount / 1000).toFixed(1)}K`;
    }
    return numAmount.toString();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🏆';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-600';
      case 2:
        return 'text-gray-500';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-content';
    }
  };

  if (loading) {
    return (
      <div
        className={`bg-surface rounded-lg p-6 shadow transition-colors duration-300 ${className}`}
      >
        <h2 className="text-2xl font-bold mb-4 text-content">🏆 Top Predictors</h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-muted/20 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted/20 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-muted/20 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && leaders.length === 0) {
    return (
      <div
        className={`bg-surface rounded-lg p-6 shadow transition-colors duration-300 ${className}`}
      >
        <h2 className="text-2xl font-bold mb-4 text-content">🏆 Top Predictors</h2>
        <p className="text-tertiary text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-lg p-6 shadow transition-colors duration-300 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-content">🏆 Top Predictors</h2>
        <Link to="/leaderboard" className="text-primary hover:underline text-sm font-medium">
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {leaders.map((leader) => (
          <div
            key={leader.userId}
            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className={`text-lg font-bold ${getRankColor(leader.rank)}`}>
                {getRankIcon(leader.rank)}
              </div>
              <div>
                <div className="font-medium text-content text-sm">
                  {leader.displayName || leader.username}
                </div>
                <div className="text-xs text-tertiary">
                  {leader.totalBets} bets • {Math.round(leader.winRate * 100)}% win rate
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-primary text-sm">
                +{formatMuskBucks(leader.totalProfit)}
              </div>
              <div className="text-xs text-tertiary">
                {Math.round((leader.roi || 0) * 100)}% ROI
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Link
          to="/register"
          className="block w-full text-center px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Climb the leaderboard!
        </Link>
      </div>
    </div>
  );
};
