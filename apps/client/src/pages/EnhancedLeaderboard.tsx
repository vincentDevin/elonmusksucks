// apps/client/src/pages/EnhancedLeaderboard.tsx
import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ChartBarIcon,
  TrophyIcon,
  UsersIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import {
  useEnhancedLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardMetric,
} from '../hooks/useEnhancedLeaderboard';
import LeaderboardEntry from '../components/leaderboard/LeaderboardEntry';
import AchievementNotification from '../components/leaderboard/AchievementNotification';
import { getShameWall, getShameWallStats } from '../api/shameWall';
import type { ShameWallEntry, ShameWallStats } from '../api/shameWall';

type TabType = 'leaderboard' | 'shame-wall' | 'pong';

export default function EnhancedLeaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [metric, setMetric] = useState<LeaderboardMetric>('profit');
  const [showStats, setShowStats] = useState(false);

  // Shame Wall state
  const [shameWall, setShameWall] = useState<ShameWallEntry[]>([]);
  const [shameWallStats, setShameWallStats] = useState<ShameWallStats | null>(null);
  const [shameWallLoading, setShameWallLoading] = useState(false);
  const [shameWallError, setShameWallError] = useState<string | null>(null);

  // Pong state
  const [pongLeaderboard, setPongLeaderboard] = useState<any[]>([]);
  const [pongMetric, setPongMetric] = useState<string>('elo');
  const [pongLoading, setPongLoading] = useState(false);
  const [pongError, setPongError] = useState<string | null>(null);

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

  // Fetch shame wall data when tab is selected
  useEffect(() => {
    if (activeTab === 'shame-wall') {
      const fetchShameWall = async () => {
        setShameWallLoading(true);
        setShameWallError(null);
        try {
          const [wallData, statsData] = await Promise.all([getShameWall(), getShameWallStats()]);
          setShameWall(wallData);
          setShameWallStats(statsData);
        } catch (err) {
          setShameWallError(err instanceof Error ? err.message : 'Failed to load shame wall');
        } finally {
          setShameWallLoading(false);
        }
      };

      fetchShameWall();
    }
  }, [activeTab]);

  // Fetch Pong leaderboard data when tab is selected
  useEffect(() => {
    if (activeTab === 'pong') {
      const fetchPongLeaderboard = async () => {
        setPongLoading(true);
        setPongError(null);
        try {
          const response = await fetch(`/api/leaderboard/pong/${pongMetric}?limit=50`);
          if (!response.ok) {
            throw new Error('Failed to fetch Pong leaderboard');
          }
          const data = await response.json();
          setPongLeaderboard(data);
        } catch (err) {
          setPongError(err instanceof Error ? err.message : 'Failed to load Pong leaderboard');
        } finally {
          setPongLoading(false);
        }
      };

      fetchPongLeaderboard();
    }
  }, [activeTab, pongMetric]);

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

  const pongMetrics: { key: string; label: string; description: string }[] = [
    { key: 'elo', label: 'Elo Rating', description: 'Hybrid skill & economy ranking' },
    { key: 'wins', label: 'Wins', description: 'Total victories' },
    { key: 'winStreak', label: 'Win Streak', description: 'Current winning streak' },
    { key: 'totalWon', label: 'Earnings', description: 'Total MuskBucks won' },
    { key: 'totalWagered', label: 'Volume', description: 'Total MuskBucks wagered' },
    { key: 'perfectGames', label: 'Perfect Games', description: '11-0 victories' },
  ];

  // Handle initial loading states for all tabs
  const isInitialLoading =
    activeTab === 'leaderboard'
      ? loading && leaderboard.length === 0
      : activeTab === 'shame-wall'
        ? shameWallLoading && shameWall.length === 0
        : pongLoading && pongLeaderboard.length === 0;

  const hasError =
    activeTab === 'leaderboard' ? error : activeTab === 'shame-wall' ? shameWallError : pongError;

  if (isInitialLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-tertiary">
            Loading{' '}
            {activeTab === 'leaderboard'
              ? 'leaderboard'
              : activeTab === 'shame-wall'
                ? 'shame wall'
                : 'Pong leaderboard'}
            …
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">
            Error: {hasError instanceof Error ? hasError.message : hasError}
          </p>
          <button
            onClick={() => (activeTab === 'leaderboard' ? refresh() : setActiveTab('shame-wall'))}
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

      {/* Main Tab Navigation */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 ${
            activeTab === 'leaderboard'
              ? 'bg-primary text-surface shadow-xl scale-105'
              : 'bg-surface text-content hover:bg-accent hover:scale-105'
          }`}
        >
          <TrophyIcon className="w-6 h-6" />
          <span>Leaderboard</span>
        </button>
        <button
          onClick={() => setActiveTab('pong')}
          className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 ${
            activeTab === 'pong'
              ? 'bg-primary text-white shadow-xl scale-105'
              : 'bg-surface text-content hover:bg-primary/10 hover:text-primary hover:scale-105'
          }`}
        >
          <PuzzlePieceIcon className="w-6 h-6" />
          <span>Pong</span>
        </button>
        <button
          onClick={() => setActiveTab('shame-wall')}
          className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 ${
            activeTab === 'shame-wall'
              ? 'bg-red-500 text-white shadow-xl scale-105'
              : 'bg-surface text-content hover:bg-red-50 hover:text-red-600 hover:scale-105'
          }`}
        >
          <ExclamationTriangleIcon className="w-6 h-6" />
          <span>Shame Wall</span>
        </button>
      </div>

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-primary flex items-center justify-center space-x-3">
          {activeTab === 'leaderboard' ? (
            <>
              <TrophyIcon className="w-10 h-10" />
              <span>Live Leaderboard</span>
              <TrophyIcon className="w-10 h-10" />
            </>
          ) : activeTab === 'pong' ? (
            <>
              <PuzzlePieceIcon className="w-10 h-10 text-primary" />
              <span className="text-primary">Pong Champions</span>
              <PuzzlePieceIcon className="w-10 h-10 text-primary" />
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
              <span className="text-red-500">Wall of Shame</span>
              <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
            </>
          )}
        </h1>

        {activeTab === 'leaderboard' && stats && (
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

        {activeTab === 'pong' && pongLeaderboard.length > 0 && (
          <div className="text-sm text-tertiary space-y-1">
            <p>
              {pongLeaderboard.length} Pong players • Top Elo:{' '}
              {pongLeaderboard[0]?.eloRating || 'N/A'}
            </p>
            <p>Viewing: {pongMetrics.find((m) => m.key === pongMetric)?.label} rankings</p>
          </div>
        )}

        {activeTab === 'shame-wall' && shameWallStats && (
          <div className="text-sm text-tertiary space-y-1">
            <p>
              {shameWallStats.totalBanned} banned users • {shameWallStats.permanentBans} permanent •{' '}
              {shameWallStats.temporaryBans} temporary
            </p>
            {shameWallStats.mostCommonReasons.length > 0 && (
              <p>
                Most common: {shameWallStats.mostCommonReasons[0].reason} (
                {shameWallStats.mostCommonReasons[0].count})
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls - Only for Leaderboard */}
      {activeTab === 'leaderboard' && (
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
      )}

      {/* Pong Controls */}
      {activeTab === 'pong' && (
        <div className="bg-surface rounded-xl p-4 space-y-4">
          {/* Metric Selection */}
          <div className="flex flex-wrap justify-center space-x-2">
            {pongMetrics.map(({ key, label, description }) => (
              <button
                key={key}
                onClick={() => setPongMetric(key)}
                title={description}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                  ${
                    pongMetric === key
                      ? 'bg-primary text-white'
                      : 'bg-muted/50 text-content hover:bg-primary/10 hover:text-primary'
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
              onClick={() => {
                if (activeTab === 'pong') {
                  const fetchPongLeaderboard = async () => {
                    setPongLoading(true);
                    try {
                      const response = await fetch(`/api/leaderboard/pong/${pongMetric}?limit=50`);
                      if (!response.ok) {
                        throw new Error('Failed to fetch Pong leaderboard');
                      }
                      const data = await response.json();
                      setPongLeaderboard(data);
                    } catch (err) {
                      setPongError(
                        err instanceof Error ? err.message : 'Failed to load Pong leaderboard',
                      );
                    } finally {
                      setPongLoading(false);
                    }
                  };
                  fetchPongLeaderboard();
                }
              }}
              disabled={pongLoading}
              className="flex items-center space-x-2 bg-accent text-content px-3 py-2 rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${pongLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Shame Wall Controls */}
      {activeTab === 'shame-wall' && (
        <div className="bg-surface rounded-xl p-4">
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                if (activeTab === 'shame-wall') {
                  const fetchShameWall = async () => {
                    setShameWallLoading(true);
                    try {
                      const [wallData, statsData] = await Promise.all([
                        getShameWall(),
                        getShameWallStats(),
                      ]);
                      setShameWall(wallData);
                      setShameWallStats(statsData);
                    } catch (err) {
                      setShameWallError(
                        err instanceof Error ? err.message : 'Failed to load shame wall',
                      );
                    } finally {
                      setShameWallLoading(false);
                    }
                  };
                  fetchShameWall();
                }
              }}
              disabled={shameWallLoading}
              className="flex items-center space-x-2 bg-accent text-content px-3 py-2 rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${shameWallLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* User's Current Rank - Only for Leaderboard */}
      {activeTab === 'leaderboard' && user && userRank && (
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

      {/* Statistics Panel - Only for Leaderboard */}
      {activeTab === 'leaderboard' && showStats && stats && (
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
              <div className="text-2xl font-bold text-primary">
                {stats.totalBets.toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Total Bets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {stats.totalVolume.toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Total Volume</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Rank Changes - Only for Leaderboard */}
      {activeTab === 'leaderboard' && recentChanges.length > 0 && (
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

      {/* Shame Wall Entries */}
      {activeTab === 'shame-wall' && (
        <>
          {shameWall.length > 0 ? (
            <ul className="space-y-4">
              {shameWall.map((entry) => (
                <li
                  key={entry.userId}
                  className="bg-surface rounded-xl shadow-sm hover:shadow-md transition border-l-4 border-red-500"
                >
                  <div className="p-6">
                    {/* Header with User Info and Ban Status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={`${entry.userName}'s avatar`}
                            className="w-16 h-16 rounded-full object-cover border-4 border-red-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center border-4 border-red-200">
                            <span className="text-red-500 text-2xl">😱</span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-content">{entry.userName}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-bold ${
                                entry.endDate
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {entry.endDate ? 'Temporary Ban' : 'Permanent Ban'}
                            </span>
                            {entry.banCount > 1 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                {entry.banCount} bans
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-tertiary">
                        <div>Banned: {new Date(entry.startDate).toLocaleDateString()}</div>
                        {entry.endDate && (
                          <div>Until: {new Date(entry.endDate).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>

                    {/* Ban Reason */}
                    <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="text-sm font-medium text-red-800 mb-1">Reason for Ban:</h4>
                      <p className="text-red-700">{entry.reason}</p>
                    </div>

                    {/* Shame Achievements */}
                    {entry.shameAchievements.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-tertiary mb-2">
                          Shame Achievements:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {entry.shameAchievements.map((achievement) => (
                            <div
                              key={achievement.slug}
                              className="bg-red-100 border border-red-300 rounded-lg p-2 min-w-[120px]"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">😱</span>
                                <div>
                                  <div className="text-xs font-bold text-red-800">
                                    {achievement.title}
                                  </div>
                                  <div className="text-xs text-red-600 mt-1">
                                    {achievement.description}
                                  </div>
                                  <div className="text-xs text-red-500 mt-1">
                                    {new Date(achievement.awardedAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-content mb-2">
                No one is currently banned!
              </h3>
              <p className="text-tertiary">Everyone is behaving themselves... for now.</p>
            </div>
          )}
        </>
      )}

      {/* Pong Leaderboard Entries */}
      {activeTab === 'pong' && pongLeaderboard.length > 0 && (
        <ul className="space-y-4">
          {pongLeaderboard.map((entry, idx) => (
            <li
              key={entry.user.id}
              className={`bg-surface rounded-xl shadow-sm hover:shadow-md transition border-l-4 border-primary ${
                user?.id === entry.user.id ? 'ring-2 ring-primary/50' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-bold text-primary">#{idx + 1}</div>
                    {entry.user.avatarUrl ? (
                      <img
                        src={entry.user.avatarUrl}
                        alt={`${entry.user.name}'s avatar`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {entry.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-content">{entry.user.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            entry.tier === 'GRANDMASTER'
                              ? 'bg-purple-100 text-purple-800'
                              : entry.tier === 'MASTER'
                                ? 'bg-red-100 text-red-800'
                                : entry.tier === 'DIAMOND'
                                  ? 'bg-primary/10 text-primary'
                                  : entry.tier === 'PLATINUM'
                                    ? 'bg-green-100 text-green-800'
                                    : entry.tier === 'GOLD'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : entry.tier === 'SILVER'
                                        ? 'bg-gray-100 text-gray-800'
                                        : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {entry.tier}
                        </span>
                        {entry.riskTaker && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                            🎲 High Roller
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {pongMetric === 'elo'
                        ? entry.eloRating
                        : pongMetric === 'wins'
                          ? entry.wins
                          : pongMetric === 'winStreak'
                            ? entry.winStreak
                            : pongMetric === 'totalWon'
                              ? `${(Number(entry.totalWon) / 1000).toFixed(1)}k`
                              : pongMetric === 'totalWagered'
                                ? `${(Number(entry.totalWagered) / 1000).toFixed(1)}k`
                                : entry.perfectGames}
                    </div>
                    <div className="text-sm text-tertiary">
                      {pongMetrics.find((m) => m.key === pongMetric)?.label}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-primary">{entry.eloRating}</div>
                    <div className="text-tertiary">Elo Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-success">{entry.wins}</div>
                    <div className="text-tertiary">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-warning">{entry.winRate?.toFixed(1)}%</div>
                    <div className="text-tertiary">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-accent">
                      {(Number(entry.totalWon) / 1000).toFixed(1)}k
                    </div>
                    <div className="text-tertiary">Earnings</div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pong Empty State */}
      {activeTab === 'pong' && pongLeaderboard.length === 0 && !pongLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏓</div>
          <h3 className="text-xl font-semibold text-content mb-2">No Pong champions yet!</h3>
          <p className="text-tertiary">Be the first to dominate the Pong leaderboard.</p>
        </div>
      )}

      {/* Leaderboard Entries */}
      {activeTab === 'leaderboard' && leaderboard.length > 0 ? (
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
      ) : activeTab === 'leaderboard' ? (
        <div className="text-center py-12">
          <p className="text-tertiary">No leaderboard entries yet.</p>
        </div>
      ) : null}

      {/* Pagination - Only for Leaderboard */}
      {activeTab === 'leaderboard' && pagination.totalPages > 1 && (
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
      {((activeTab === 'leaderboard' && loading && leaderboard.length > 0) ||
        (activeTab === 'shame-wall' && shameWallLoading && shameWall.length > 0) ||
        (activeTab === 'pong' && pongLoading && pongLeaderboard.length > 0)) && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-surface rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>
                Updating{' '}
                {activeTab === 'leaderboard'
                  ? 'leaderboard'
                  : activeTab === 'shame-wall'
                    ? 'shame wall'
                    : 'Pong leaderboard'}
                ...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
