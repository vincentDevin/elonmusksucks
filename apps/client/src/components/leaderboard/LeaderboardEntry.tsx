import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCircleIcon, TrophyIcon, FireIcon } from '@heroicons/react/24/outline';
import type { UnifiedLeaderboardEntry as UnifiedEntry } from './types';

interface LeaderboardEntryProps {
  entry: UnifiedEntry;
  rank: number;
  isCurrentUser?: boolean;
  showAnimation?: boolean;
  className?: string;
}

const variantStyles = {
  betting: {
    borderColor: 'border-primary',
    highlightBg: 'bg-primary/10',
    rankColor: 'text-primary',
  },
  pong: {
    borderColor: 'border-blue-500',
    highlightBg: 'bg-blue-500/10',
    rankColor: 'text-blue-500',
  },
  shame: {
    borderColor: 'border-red-500',
    highlightBg: 'bg-red-500/10',
    rankColor: 'text-red-500',
  },
};

export function LeaderboardEntry({
  entry,
  rank,
  isCurrentUser = false,
  showAnimation = false,
  className = '',
}: LeaderboardEntryProps) {
  const [animate, setAnimate] = useState(false);
  const styles = variantStyles[entry.variant];

  // Handle animation trigger
  useEffect(() => {
    if (showAnimation) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showAnimation]);

  // Determine rank styling
  const getRankStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'text-yellow-400 text-3xl font-bold';
      case 2:
        return 'text-gray-300 text-2xl font-bold';
      case 3:
        return 'text-amber-600 text-2xl font-bold';
      default:
        return `text-2xl font-bold ${styles.rankColor}`;
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

  // Content wrapper component
  const WrapperContent = ({ children }: { children: React.ReactNode }) => {
    if (entry.variant === 'shame') {
      return <div className="block p-6">{children}</div>;
    }
    return (
      <Link
        to={`/profile/${entry.id}`}
        className="block p-6 group-hover:bg-muted/20 transition-colors"
      >
        {children}
      </Link>
    );
  };

  return (
    <li
      className={`
        relative overflow-hidden rounded-xl shadow-sm transition-all duration-300 group
        ${isCurrentUser ? `${styles.highlightBg} border-2 ${styles.borderColor}` : 'bg-surface hover:shadow-md border border-muted'}
        ${animate ? 'transform scale-105 shadow-lg' : ''}
        ${entry.variant === 'shame' ? 'border-l-4 border-red-500' : ''}
        ${className}
      `}
    >
      {/* Animation overlay */}
      {animate && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 animate-pulse z-10 pointer-events-none" />
      )}

      {/* Streak indicator for high performers */}
      {entry.variant === 'betting' &&
        entry.secondaryStats.some(
          (stat) => stat.label.includes('Streak') && parseInt(stat.value) >= 5,
        ) && (
          <div className="absolute top-2 right-2 z-20">
            <div className="flex items-center space-x-1 bg-orange-500/20 px-2 py-1 rounded-full">
              <FireIcon className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-medium text-orange-400">
                {entry.secondaryStats.find((s) => s.label.includes('Streak'))?.value}
              </span>
            </div>
          </div>
        )}

      <WrapperContent>
        <div className="flex items-center space-x-6">
          {/* Rank & Avatar Section */}
          <div className="flex items-center space-x-3">
            {/* Rank Display */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <div className="flex items-center justify-center">
                {getRankIcon(rank)}
                <span className={`${getRankStyle(rank)} transition-transform duration-300`}>
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
                    w-14 h-14 rounded-full object-cover border-2 transition-all duration-300
                    ${isCurrentUser ? styles.borderColor.replace('border-', 'border-') : 'border-muted'}
                    ${animate ? 'scale-110' : ''}
                  `}
                />
              ) : (
                <div
                  className={`
                    w-14 h-14 flex items-center justify-center rounded-full border-2 transition-all duration-300
                    ${isCurrentUser ? `${styles.highlightBg} ${styles.borderColor}` : 'bg-muted border-muted'}
                    ${animate ? 'scale-110' : ''}
                  `}
                >
                  <UserCircleIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}

              {/* Current user indicator */}
              {isCurrentUser && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-surface" />
              )}
            </div>

            {/* Name, Badges & Primary Stat */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span
                  className={`font-bold text-xl truncate ${isCurrentUser ? styles.rankColor : 'text-content'}`}
                >
                  {entry.userName}
                </span>
                {isCurrentUser && (
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${styles.highlightBg} ${styles.rankColor} font-medium`}
                  >
                    You
                  </span>
                )}
              </div>

              {/* Badges - limit to 2 most important */}
              {entry.badges && entry.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {entry.badges.slice(0, 2).map((badge, idx) => (
                    <span
                      key={idx}
                      className={`text-sm px-3 py-1 rounded-full font-medium ${badge.color}`}
                    >
                      {badge.icon && <span className="mr-1">{badge.icon}</span>}
                      {badge.text}
                    </span>
                  ))}
                </div>
              )}

              {/* Primary Stat (Mobile) */}
              <div className="md:hidden">
                <div className={`text-xl font-bold ${entry.primaryStat.color || 'text-content'}`}>
                  {entry.primaryStat.value}
                </div>
                <div className="text-sm text-tertiary">{entry.primaryStat.label}</div>
              </div>
            </div>
          </div>

          {/* Stats Grid (Desktop) */}
          <div className="hidden md:flex flex-1 justify-end">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 min-w-0">
              {/* Primary Stat */}
              <div className="text-center">
                <div className="text-sm text-tertiary uppercase font-medium mb-2">
                  {entry.primaryStat.label}
                </div>
                <div
                  className={`
                    font-bold text-lg transition-all duration-300
                    ${entry.primaryStat.highlight ? `${styles.rankColor} scale-110` : ''}
                    ${entry.primaryStat.color || 'text-content'}
                  `}
                >
                  {entry.primaryStat.value}
                </div>
              </div>

              {/* Secondary Stats - reduced to 3 most important */}
              {entry.secondaryStats.slice(0, 3).map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-sm text-tertiary uppercase font-medium mb-2 truncate">
                    {stat.label}
                  </div>
                  <div
                    className={`
                      font-bold text-base transition-all duration-300
                      ${stat.highlight ? `${styles.rankColor} scale-110` : ''}
                      ${stat.color || 'text-content'}
                    `}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Stats Grid */}
        <div className="md:hidden mt-6 grid grid-cols-2 gap-4">
          {entry.secondaryStats.slice(0, 4).map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-sm text-tertiary uppercase font-medium mb-1">{stat.label}</div>
              <div
                className={`
                  font-bold text-base
                  ${stat.color || 'text-content'}
                `}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Special Shame Wall Content */}
        {entry.variant === 'shame' && entry.rawData && 'reason' in entry.rawData && (
          <div className="mt-6">
            {/* Ban Reason */}
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <h4 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">
                Reason for Ban:
              </h4>
              <p className="text-content text-base">{entry.rawData.reason}</p>
            </div>
          </div>
        )}
      </WrapperContent>
    </li>
  );
}
