import React from 'react';
import type { LeaderboardPreviewProps } from '../types';

export default function LeaderboardPreview({
  data,
  className = '',
  clientAppUrl,
}: LeaderboardPreviewProps) {
  // Use fallback data if API data is not available or not an array
  const leaders = (Array.isArray(data) ? data : null) || [
    {
      userId: 1,
      userName: 'MuskTracker2024',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      balance: '45650',
      totalBets: 156,
      winRate: 0.72,
      profitAll: '45650',
      profitPeriod: '12000',
      roi: 0.45,
      longestStreak: 5,
      rank: 1,
    },
    {
      userId: 2,
      userName: 'TeslaBear',
      avatarUrl: 'https://i.pravatar.cc/150?img=2',
      balance: '38200',
      totalBets: 142,
      winRate: 0.68,
      profitAll: '38200',
      profitPeriod: '8500',
      roi: 0.42,
      longestStreak: 3,
      rank: 2,
    },
    {
      userId: 3,
      userName: 'SpaceXFan',
      avatarUrl: 'https://i.pravatar.cc/150?img=3',
      balance: '32100',
      totalBets: 128,
      winRate: 0.65,
      profitAll: '32100',
      profitPeriod: '5200',
      roi: 0.38,
      longestStreak: 4,
      rank: 3,
    },
  ];

  const formatMuskBucks = (amount: string | number | bigint | undefined | null) => {
    if (amount == null || amount === undefined) {
      return '0';
    }

    // Convert to number for formatting
    let numAmount: number;
    if (typeof amount === 'string') {
      numAmount = parseFloat(amount);
    } else if (typeof amount === 'bigint') {
      numAmount = Number(amount);
    } else {
      numAmount = amount;
    }

    if (isNaN(numAmount)) {
      return '0';
    }

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

  return (
    <div className={`bg-surface rounded-lg p-6 shadow ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-content">🏆 Top Predictors</h2>
        <a href="/leaderboard" className="text-primary hover:underline text-sm font-medium">
          View all →
        </a>
      </div>

      <div className="space-y-3">
        {leaders.slice(0, 5).map((leader) => (
          <div
            key={leader.userId}
            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className={`text-lg font-bold ${getRankColor(leader.rank)}`}>
                {getRankIcon(leader.rank)}
              </div>
              <div>
                <div className="font-medium text-content text-sm">{leader.userName}</div>
                <div className="text-xs text-tertiary">
                  {leader.totalBets} bets • {Math.round(leader.winRate * 100)}% win rate
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-primary text-sm">
                +{formatMuskBucks(leader.profitAll)}
              </div>
              <div className="text-xs text-tertiary">
                {Math.round((leader.roi || 0) * 100)}% ROI
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <a
          href={`${clientAppUrl}/register`}
          className="block w-full text-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          Climb the leaderboard!
        </a>
      </div>
    </div>
  );
}
