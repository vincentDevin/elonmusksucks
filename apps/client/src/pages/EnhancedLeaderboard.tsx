// apps/client/src/pages/EnhancedLeaderboard.tsx
import { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ChartBarIcon,
  TrophyIcon,
  UsersIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import {
  useEnhancedLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardMetric,
} from '../hooks/useEnhancedLeaderboard';
import LeaderboardEntry from '../components/leaderboard/LeaderboardEntry';
import AchievementNotification from '../components/leaderboard/AchievementNotification';

export default function EnhancedLeaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [metric, setMetric] = useState<LeaderboardMetric>('profit');
  const [showStats, setShowStats] = useState(false);

  const {
    data: leaderboard,
    pagination,
    userRank,
    stats,
    recentChanges,
    achievements,
    loading,
    error,
    currentPage,
    nextPage,
    prevPage,
    goToPage,
    refresh,
    clearAchievements,
  } = useEnhancedLeaderboard(period, {
    limit: 25,
    metric,
    trackRankChanges: true,
    enableAchievements: true,
  });

  const periods: { key: LeaderboardPeriod; label: string; icon: any }[] = [
    { key: 'all-time', label: 'All-Time', icon: TrophyIcon },
    { key: 'daily', label: 'Daily', icon: CalendarIcon },
  ];

  const metrics: { key: LeaderboardMetric; label: string; description: string }[] = [
    { key: 'profit', label: 'Profit', description: 'Total earnings' },
    { key: 'winRate', label: 'Win Rate', description: 'Success percentage' },
    { key: 'volume', label: 'Volume', description: 'Total bets placed' },
    { key: 'roi', label: 'ROI', description: 'Return on investment' },
  ];

  if (loading && leaderboard.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-tertiary">Loading leaderboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error: {error.message}</p>
          <button
            onClick={refresh}
            className="bg-primary text-surface px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Achievement Notifications */}
      <AchievementNotification achievements={achievements} onClear={clearAchievements} />

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-primary flex items-center justify-center space-x-3">
          <TrophyIcon className="w-10 h-10" />
          <span>Live Leaderboard</span>
          <TrophyIcon className="w-10 h-10" />
        </h1>

        {stats && (
          <div className="text-sm text-tertiary space-y-1">
            <p>
              {stats.totalUsers.toLocaleString()} total users • {stats.activeUsers.toLocaleString()}{' '}
              active
            </p>
            {stats.lastRefresh && (
              <p>Last updated: {new Date(stats.lastRefresh).toLocaleTimeString()}</p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-surface rounded-xl p-4 space-y-4">
        {/* Period Selection */}
        <div className="flex flex-wrap justify-center space-x-2">
          {periods.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all duration-200
                ${
                  period === key
                    ? 'bg-primary text-surface shadow-lg scale-105'
                    : 'bg-muted text-content hover:bg-accent hover:scale-105'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Metric Selection */}
        <div className="flex flex-wrap justify-center space-x-2">
          {metrics.map(({ key, label, description }) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              title={description}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                ${
                  metric === key
                    ? 'bg-secondary text-surface'
                    : 'bg-muted/50 text-content hover:bg-muted'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center space-x-2 bg-accent text-content px-3 py-2 rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center space-x-2 bg-muted text-content px-3 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ChartBarIcon className="w-4 h-4" />
            <span>{showStats ? 'Hide' : 'Show'} Stats</span>
          </button>
        </div>
      </div>

      {/* User's Current Rank */}
      {user && userRank && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UsersIcon className="w-6 h-6 text-primary" />
              <span className="font-semibold text-primary">Your Rank</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                #{period === 'all-time' ? userRank.allTimeRank : userRank.dailyRank}
              </div>
              <div className="text-sm text-tertiary">
                {period === 'all-time' ? 'All-Time' : 'Daily'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Panel */}
      {showStats && stats && (
        <div className="bg-surface rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5" />
            <span>Leaderboard Statistics</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.totalUsers.toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {stats.activeUsers.toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {stats.totalBets.toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Total Bets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.totalVolume.toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Total Volume</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Rank Changes */}
      {recentChanges.length > 0 && (
        <div className="bg-surface rounded-xl p-4">
          <h3 className="text-sm font-semibold text-tertiary mb-3">Recent Rank Changes</h3>
          <div className="flex flex-wrap gap-2">
            {recentChanges.slice(-10).map((change, idx) => (
              <div
                key={idx}
                className={`
                  text-xs px-2 py-1 rounded-full
                  ${
                    change.change > 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }
                `}
              >
                User {change.userId}: {change.oldRank} → {change.newRank}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Entries */}
      {leaderboard.length > 0 ? (
        <ul className="space-y-4">
          {leaderboard.map((entry, idx) => {
            const rank = (currentPage - 1) * 25 + idx + 1;
            const recentChange = recentChanges.find((change) => change.userId === entry.userId);
            const isCurrentUser = user?.id === entry.userId;

            return (
              <LeaderboardEntry
                key={entry.userId}
                entry={entry}
                rank={rank}
                period={period}
                recentChange={recentChange}
                isCurrentUser={isCurrentUser}
              />
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-12">
          <p className="text-tertiary">No leaderboard entries yet.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 py-6">
          <button
            onClick={prevPage}
            disabled={!pagination.hasPrevPage || loading}
            className="flex items-center space-x-2 px-4 py-2 bg-surface rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = Math.max(1, currentPage - 2) + i;
              if (page > pagination.totalPages) return null;

              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`
                    w-10 h-10 rounded-lg font-medium transition-colors
                    ${
                      page === currentPage
                        ? 'bg-primary text-surface'
                        : 'bg-surface hover:bg-accent text-content'
                    }
                  `}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={nextPage}
            disabled={!pagination.hasNextPage || loading}
            className="flex items-center space-x-2 px-4 py-2 bg-surface rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && leaderboard.length > 0 && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-surface rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Updating leaderboard...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
