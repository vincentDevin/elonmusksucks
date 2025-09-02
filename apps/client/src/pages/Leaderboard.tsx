// apps/client/src/pages/Leaderboard.tsx
// Unified leaderboard with consistent design across all tabs
import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import {
  useLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardMetric,
} from '../hooks/useLeaderboard';
import type { PongLeaderboardView } from '@ems/types';
import { getShameWall, getShameWallStats } from '../api/shameWall';
import type { ShameWallEntry, ShameWallStats } from '../api/shameWall';

// New unified components
import { UnifiedLeaderboardHeader } from '../components/leaderboard/UnifiedLeaderboardHeader';
import { UnifiedLeaderboardEntry } from '../components/leaderboard/UnifiedLeaderboardEntry';
import { CompactControlBar } from '../components/leaderboard/CompactControlBar';
import AchievementNotification from '../components/leaderboard/AchievementNotification';
import {
  transformBettingEntry,
  transformPongEntry,
  transformShameEntry,
  transformBettingHeaderStats,
  transformPongHeaderStats,
  transformShameHeaderStats,
} from '../components/leaderboard/dataTransformers';
import type { LeaderboardVariant, ControlBarConfig } from '../components/leaderboard/types';

type TabType = 'betting' | 'pong' | 'shame';

export default function Leaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('betting');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [metric, setMetric] = useState<LeaderboardMetric>('profit');

  // Shame Wall state
  const [shameWall, setShameWall] = useState<ShameWallEntry[]>([]);
  const [shameWallStats, setShameWallStats] = useState<ShameWallStats | null>(null);
  const [shameWallLoading, setShameWallLoading] = useState(false);
  const [shameWallError, setShameWallError] = useState<string | null>(null);

  // Pong state
  const [pongLeaderboard, setPongLeaderboard] = useState<PongLeaderboardView[]>([]);
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
  } = useLeaderboard(period, {
    limit: 25,
    metric,
    trackRankChanges: true,
    enableAchievements: true,
  });

  // Fetch shame wall data when tab is selected
  useEffect(() => {
    if (activeTab === 'shame') {
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

  // Tab configuration
  const tabs = [
    { id: 'betting' as TabType, label: 'Leaderboard', icon: TrophyIcon },
    { id: 'pong' as TabType, label: 'Pong', icon: PuzzlePieceIcon },
    { id: 'shame' as TabType, label: 'Shame Wall', icon: ExclamationTriangleIcon },
  ];

  // Create unified entries for current tab
  const unifiedEntries = useMemo(() => {
    switch (activeTab) {
      case 'betting':
        return leaderboard.map((entry) => transformBettingEntry(entry, period));
      case 'pong':
        return pongLeaderboard
          .filter((entry) => entry && entry.userId && entry.userName)
          .map((entry) => transformPongEntry(entry, pongMetric));
      case 'shame':
        return shameWall.map((entry) => transformShameEntry(entry));
      default:
        return [];
    }
  }, [activeTab, leaderboard, pongLeaderboard, shameWall, period, pongMetric]);

  // Create header stats for current tab
  const headerStats = useMemo(() => {
    switch (activeTab) {
      case 'betting':
        return transformBettingHeaderStats(stats, userRank);
      case 'pong':
        return transformPongHeaderStats(pongLeaderboard);
      case 'shame':
        return transformShameHeaderStats(shameWallStats);
      default:
        return undefined;
    }
  }, [activeTab, stats, userRank, pongLeaderboard, shameWallStats]);

  // Create control bar configuration
  const controlBarConfig: ControlBarConfig = useMemo(() => {
    const variant = activeTab as LeaderboardVariant;

    const baseConfig = {
      variant,
      filterGroups: [],
      actions: [
        {
          label: 'Refresh',
          icon: ArrowPathIcon,
          onClick: () => {
            if (activeTab === 'betting') refresh();
            else if (activeTab === 'pong') {
              const fetchPong = async () => {
                setPongLoading(true);
                try {
                  const response = await fetch(`/api/leaderboard/pong/${pongMetric}?limit=50`);
                  const data = await response.json();
                  setPongLeaderboard(data);
                } catch (err) {
                  setPongError(err instanceof Error ? err.message : 'Failed to refresh');
                } finally {
                  setPongLoading(false);
                }
              };
              fetchPong();
            } else if (activeTab === 'shame') {
              const fetchShame = async () => {
                setShameWallLoading(true);
                try {
                  const [wallData, statsData] = await Promise.all([
                    getShameWall(),
                    getShameWallStats(),
                  ]);
                  setShameWall(wallData);
                  setShameWallStats(statsData);
                } catch (err) {
                  setShameWallError(err instanceof Error ? err.message : 'Failed to refresh');
                } finally {
                  setShameWallLoading(false);
                }
              };
              fetchShame();
            }
          },
          loading: loading || pongLoading || shameWallLoading,
          variant: 'secondary' as const,
        },
      ],
    };

    // Add tab-specific filters
    if (activeTab === 'betting') {
      baseConfig.filterGroups = [
        {
          label: 'Period',
          options: [
            { key: 'all-time', label: 'All-Time', description: 'Total earnings' },
            { key: 'daily', label: 'Daily', description: 'Today only' },
          ],
          value: period,
          onChange: (value) => setPeriod(value as LeaderboardPeriod),
        },
        {
          label: 'Metric',
          options: [
            { key: 'profit', label: 'Profit', description: 'Total earnings' },
            { key: 'winRate', label: 'Win Rate', description: 'Success percentage' },
            { key: 'volume', label: 'Volume', description: 'Total bets placed' },
            { key: 'roi', label: 'ROI', description: 'Return on investment' },
          ],
          value: metric,
          onChange: (value) => setMetric(value as LeaderboardMetric),
        },
      ];
    } else if (activeTab === 'pong') {
      baseConfig.filterGroups = [
        {
          label: 'Metric',
          options: [
            { key: 'elo', label: 'Elo Rating', description: 'Skill ranking' },
            { key: 'wins', label: 'Wins', description: 'Total victories' },
            { key: 'winStreak', label: 'Win Streak', description: 'Current streak' },
            { key: 'totalWon', label: 'Earnings', description: 'Total won' },
            { key: 'totalWagered', label: 'Volume', description: 'Total wagered' },
            { key: 'perfectGames', label: 'Perfect Games', description: '11-0 victories' },
          ],
          value: pongMetric,
          onChange: (value) => setPongMetric(value),
        },
      ];
    }

    return baseConfig;
  }, [activeTab, period, metric, pongMetric, refresh, loading, pongLoading, shameWallLoading]);

  // Handle initial loading states for all tabs
  const isInitialLoading =
    activeTab === 'betting'
      ? loading && leaderboard.length === 0
      : activeTab === 'shame'
        ? shameWallLoading && shameWall.length === 0
        : pongLoading && pongLeaderboard.length === 0;

  const hasError =
    activeTab === 'betting' ? error : activeTab === 'shame' ? shameWallError : pongError;

  const currentLoading =
    activeTab === 'betting' ? loading : activeTab === 'pong' ? pongLoading : shameWallLoading;

  if (isInitialLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-tertiary">
            Loading{' '}
            {activeTab === 'betting'
              ? 'leaderboard'
              : activeTab === 'shame'
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
            onClick={() => controlBarConfig.actions[0].onClick()}
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

      {/* Unified Header with Tab Navigation */}
      <div className="space-y-4">
        <UnifiedLeaderboardHeader
          variant={activeTab as LeaderboardVariant}
          title={
            activeTab === 'betting'
              ? 'Live Leaderboard'
              : activeTab === 'pong'
                ? 'Pong Champions'
                : 'Wall of Shame'
          }
          subtitle={
            activeTab === 'betting'
              ? 'Real-time betting performance rankings'
              : activeTab === 'pong'
                ? 'Elite Pong players and their achievements'
                : 'Users who have been banned from the platform'
          }
          icon={
            activeTab === 'betting'
              ? TrophyIcon
              : activeTab === 'pong'
                ? PuzzlePieceIcon
                : ExclamationTriangleIcon
          }
          stats={headerStats}
          isLoading={currentLoading}
        />

        {/* Tab Navigation */}
        <div className="flex justify-center space-x-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            let activeStyle = 'bg-primary text-white shadow-xl scale-105';
            let hoverStyle = 'bg-surface text-content hover:bg-accent hover:scale-105';

            if (tab.id === 'pong') {
              activeStyle = 'bg-blue-500 text-white shadow-xl scale-105';
              hoverStyle =
                'bg-surface text-content hover:bg-blue-500/10 hover:text-blue-500 hover:scale-105';
            } else if (tab.id === 'shame') {
              activeStyle = 'bg-red-500 text-white shadow-xl scale-105';
              hoverStyle =
                'bg-surface text-content hover:bg-red-50 hover:text-red-600 hover:scale-105';
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 ${
                  isActive ? activeStyle : hoverStyle
                }`}
              >
                <tab.icon className="w-6 h-6" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified Control Bar - Combined for all tabs */}
      <CompactControlBar config={controlBarConfig} />

      {/* User Rank for betting leaderboard - integrated into header stats now */}

      {/* Unified Entries List */}
      {unifiedEntries.length > 0 ? (
        <ul className="space-y-4">
          {unifiedEntries.map((entry, idx) => {
            const rank = activeTab === 'betting' ? (currentPage - 1) * 25 + idx + 1 : idx + 1;
            const recentChange =
              activeTab === 'betting'
                ? recentChanges.find((change) => change.userId === entry.id)
                : undefined;
            const isCurrentUser = user?.id === entry.id;

            return (
              <UnifiedLeaderboardEntry
                key={`${activeTab}-${entry.id}`}
                entry={entry}
                rank={rank}
                isCurrentUser={isCurrentUser}
                showAnimation={!!recentChange}
              />
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">
            {activeTab === 'betting' ? '📊' : activeTab === 'pong' ? '🏓' : '🎉'}
          </div>
          <h3 className="text-xl font-semibold text-content mb-2">
            {activeTab === 'betting'
              ? 'No leaderboard entries yet.'
              : activeTab === 'pong'
                ? 'No Pong champions yet!'
                : 'No one is currently banned!'}
          </h3>
          <p className="text-tertiary">
            {activeTab === 'betting'
              ? 'Be the first to place some bets!'
              : activeTab === 'pong'
                ? 'Be the first to dominate the Pong leaderboard.'
                : 'Everyone is behaving themselves... for now.'}
          </p>
        </div>
      )}

      {/* Pagination - Only for Betting Leaderboard */}
      {activeTab === 'betting' && pagination.totalPages > 1 && (
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
      {currentLoading && unifiedEntries.length > 0 && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-surface rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>
                Updating{' '}
                {activeTab === 'betting'
                  ? 'leaderboard'
                  : activeTab === 'pong'
                    ? 'Pong leaderboard'
                    : 'shame wall'}
                ...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
