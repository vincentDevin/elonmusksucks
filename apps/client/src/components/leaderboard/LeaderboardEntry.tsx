// apps/client/src/components/leaderboard/LeaderboardEntry.tsx
import { useState, useEffect } from 'react';

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);
import { Link } from 'react-router-dom';
import { UserCircleIcon, TrophyIcon, FireIcon } from '@heroicons/react/24/outline';
import type { PublicLeaderboardEntry } from '@ems/types';
import type { RankChange } from '../../hooks/useEnhancedLeaderboard';

interface LeaderboardEntryProps {
  entry: PublicLeaderboardEntry;
  rank: number;
  period: 'all-time' | 'daily';
  recentChange?: RankChange;
  isCurrentUser?: boolean;
}

export default function LeaderboardEntry({
  entry,
  rank,
  period,
  recentChange,
  isCurrentUser = false,
}: LeaderboardEntryProps) {
  const [showChangeAnimation, setShowChangeAnimation] = useState(false);
  const [previousRank, setPreviousRank] = useState(rank);

  // Animate rank changes
  useEffect(() => {
    if (recentChange && recentChange.userId === entry.userId) {
      setShowChangeAnimation(true);
      setPreviousRank(recentChange.oldRank);

      const timer = setTimeout(() => {
        setShowChangeAnimation(false);
        setPreviousRank(rank);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [recentChange, entry.userId, rank]);

  const change = entry.rankChange ?? 0;
  const changeColor = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-tertiary';
  const changeSymbol = change > 0 ? '▲' : change < 0 ? '▼' : '–';

  // Determine rank styling
  const getRankStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'text-yellow-400 text-3xl font-bold'; // Gold
      case 2:
        return 'text-gray-300 text-2xl font-bold'; // Silver
      case 3:
        return 'text-amber-600 text-2xl font-bold'; // Bronze
      default:
        return 'text-2xl font-bold';
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <TrophyIcon className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <TrophyIcon className="w-6 h-6 text-gray-300" />;
      case 3:
        return <TrophyIcon className="w-6 h-6 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <li
      className={`
        relative overflow-hidden rounded-xl shadow-sm transition-all duration-300
        ${isCurrentUser ? 'bg-primary/10 border-2 border-primary' : 'bg-surface hover:shadow-md'}
        ${showChangeAnimation ? 'transform scale-105 shadow-lg' : ''}
      `}
    >
      {/* Rank change animation overlay */}
      {showChangeAnimation && recentChange && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 animate-pulse z-10 pointer-events-none" />
      )}

      {/* Streak indicator for hot users */}
      {entry.currentStreak >= 5 && (
        <div className="absolute top-2 right-2 z-20">
          <div className="flex items-center space-x-1 bg-orange-500/20 px-2 py-1 rounded-full">
            <FireIcon className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-medium text-orange-400">{entry.currentStreak}</span>
          </div>
        </div>
      )}

      <Link
        to={`/profile/${entry.userId}`}
        className="block md:flex items-center p-4 space-y-4 md:space-y-0 md:space-x-6"
      >
        {/* Rank & Avatar Section */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Animated rank display */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            {showChangeAnimation && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`${getRankStyle(previousRank)} opacity-50 transform scale-75`}>
                  {previousRank}
                </span>
              </div>
            )}
            <div className="flex items-center justify-center">
              {getRankIcon(rank)}
              <span
                className={`${showChangeAnimation ? 'transform scale-110' : ''} ${getRankStyle(rank)} transition-transform duration-300`}
              >
                {rank <= 3 ? '' : rank}
              </span>
            </div>
          </div>

          {/* Avatar */}
          <div className="relative">
            {entry.avatarUrl ? (
              <img
                src={entry.avatarUrl}
                alt={`${entry.userName}'s avatar`}
                className={`
                  w-12 h-12 rounded-full object-cover border-2 transition-all duration-300
                  ${isCurrentUser ? 'border-primary' : 'border-muted'}
                  ${showChangeAnimation ? 'border-green-400 scale-110' : ''}
                `}
              />
            ) : (
              <span
                className={`
                w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all duration-300
                ${isCurrentUser ? 'bg-primary/20 border-primary' : 'bg-tertiary border-muted'}
                ${showChangeAnimation ? 'border-green-400 scale-110' : ''}
              `}
              >
                <UserCircleIcon className="w-10 h-10 text-gray-400" />
              </span>
            )}

            {/* Online indicator (if available) */}
            {isCurrentUser && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-surface" />
            )}
          </div>

          {/* Name and rank change */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className={`font-semibold text-lg ${isCurrentUser ? 'text-primary' : ''}`}>
                {entry.userName}
              </span>
              {isCurrentUser && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                  You
                </span>
              )}
            </div>

            {/* Rank change indicator with animation */}
            <div className="flex items-center space-x-2 mt-1">
              <span className={`font-medium text-sm ${changeColor} transition-colors duration-300`}>
                {changeSymbol} {Math.abs(change)}
              </span>

              {recentChange && recentChange.userId === entry.userId && (
                <span
                  className={`
                  text-xs px-2 py-1 rounded-full animate-pulse
                  ${recentChange.change > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                `}
                >
                  {recentChange.change > 0 ? `+${recentChange.change}` : recentChange.change}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 flex-1">
          <Stat
            label="Balance"
            value={`${entry.balance} 🪙`}
            highlight={asNum(entry.balance) > 10000}
          />
          <Stat label="Bets" value={`${entry.totalBets}`} highlight={entry.totalBets > 100} />
          <Stat
            label="Win Rate"
            value={`${(entry.winRate * 100).toFixed(1)}%`}
            highlight={entry.winRate > 0.7}
            color={
              entry.winRate > 0.7 ? 'text-green-400' : entry.winRate < 0.4 ? 'text-red-400' : ''
            }
          />
          <Stat
            label={period === 'all-time' ? 'Total Profit' : 'Daily Profit'}
            value={`${period === 'all-time' ? entry.profitAll : entry.profitPeriod} 🏦`}
            highlight={
              period === 'all-time'
                ? asNum(entry.profitAll) > 1000
                : asNum(entry.profitPeriod) > 100
            }
            color={
              asNum(period === 'all-time' ? entry.profitAll : entry.profitPeriod) > 0
                ? 'text-green-400'
                : 'text-red-400'
            }
          />
          <Stat
            label="ROI"
            value={`${(entry.roi * 100).toFixed(1)}%`}
            highlight={entry.roi > 0.2}
            color={entry.roi > 0 ? 'text-green-400' : 'text-red-400'}
          />
          <Stat
            label="Streak"
            value={`${entry.currentStreak}/${entry.longestStreak}`}
            highlight={entry.currentStreak >= 5}
            color={entry.currentStreak >= 5 ? 'text-orange-400' : ''}
          />
        </div>
      </Link>
    </li>
  );
}

interface StatProps {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}

function Stat({ label, value, highlight = false, color = '' }: StatProps) {
  return (
    <div className="space-y-1 text-center">
      <div className="text-xs text-tertiary uppercase font-medium">{label}</div>
      <div
        className={`
        font-bold text-sm transition-all duration-300
        ${highlight ? 'text-primary scale-110' : ''}
        ${color || 'text-content'}
      `}
      >
        {value}
      </div>
    </div>
  );
}
