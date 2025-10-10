import { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { formatMuskBucks, getMuskBucksColorClasses } from '../../utils/formatting';

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);
import type { UserStatsDTO, PublicUser } from '@ems/types';
import { WinLossPieChart } from './graphs/WinLossPieChart';
import { FinancialBarChart } from './graphs/FinancialBarChart';
import { PerformanceProgressBars } from './graphs/PerformanceProgressBars';
import { ProfileAchievements } from './ProfileAchievements';
import ProfilePongStats from './ProfilePongStats';

type DisplayMode = 'card' | 'panel' | 'admin';
type TabType = 'achievements' | 'stats' | 'pong';

interface ProfileStatsProps {
  // Basic props for card mode
  profile?: {
    id?: number;
    name?: string;
    muskBucks: number | string | bigint;
    rank?: number;
    achievements?: any[];
    badges?: any[];
  };
  stats?: UserStatsDTO;
  isOwn?: boolean;

  // Extended props for panel/admin modes
  mode?: DisplayMode;
  showTabs?: boolean;
  compact?: boolean;

  // Admin mode props
  users?: PublicUser[];
  allStats?: Record<number, UserStatsDTO>;
}

export function ProfileStats({
  profile,
  stats,
  isOwn = false,
  mode = 'card',
  showTabs = false,
  compact = false,
  users,
  allStats,
}: ProfileStatsProps) {
  // State management
  const [showRawStats, setShowRawStats] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('achievements');

  // Admin state
  const adminContext = mode === 'admin' ? useAdmin() : null;
  const { users: adminUsers, statsFor, loadUserStats, refreshLeaderboard } = adminContext || {};
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingLB, setLoadingLB] = useState(false);

  // Use provided data or fallback to admin context
  const displayUsers = users || adminUsers || [];
  const displayStats = allStats || statsFor || {};

  // Calculate derived stats if we have stats
  const betWinRate = stats && stats.totalBets > 0 ? stats.betsWon / stats.totalBets : 0;
  const parlayWinRate = stats && stats.totalParlays > 0 ? stats.parlaysWon / stats.totalParlays : 0;
  const parlayAccuracy =
    stats && stats.totalParlayLegs > 0 ? stats.parlayLegsWon / stats.totalParlayLegs : 0;

  // Calculate overall win rate (combines bets and parlays)
  const totalGames = (stats?.totalBets || 0) + (stats?.totalParlays || 0);
  const totalWins = (stats?.betsWon || 0) + (stats?.parlaysWon || 0);
  const overallWinRate = totalGames > 0 ? totalWins / totalGames : 0;

  // Admin action handlers
  const handleLoadAll = async () => {
    if (!loadUserStats) return;
    setLoadingAll(true);
    try {
      await Promise.all(displayUsers.map((u) => loadUserStats(u.id)));
    } finally {
      setLoadingAll(false);
    }
  };

  const handleRefreshLeaderboard = async () => {
    if (!refreshLeaderboard) return;
    setLoadingLB(true);
    try {
      await refreshLeaderboard();
    } catch (err: any) {
      console.error('Leaderboard refresh failed', err);
      alert('Failed to refresh leaderboard: ' + err.message);
    } finally {
      setLoadingLB(false);
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'achievements' as TabType, label: 'Achievements', icon: '🏆' },
    { id: 'stats' as TabType, label: 'Overview', icon: '📊' },
    { id: 'pong' as TabType, label: 'Pong Stats', icon: '🏓' },
  ];

  // Admin mode: table view
  if (mode === 'admin') {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">User Stats</h2>
          <div className="space-x-2">
            <button
              onClick={handleLoadAll}
              disabled={loadingAll}
              className="px-3 py-1 bg-accent hover:bg-accent-dark text-surface rounded transition disabled:opacity-50"
            >
              {loadingAll ? 'Loading…' : 'Load All'}
            </button>
            <button
              onClick={handleRefreshLeaderboard}
              disabled={loadingLB}
              className="px-3 py-1 bg-primary hover:bg-primary-dark text-surface rounded transition disabled:opacity-50"
            >
              {loadingLB ? 'Updating…' : 'Refresh Leaderboard'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left border-collapse">
            <thead>
              <tr className="bg-muted text-sm uppercase">
                <th className="px-2 py-1">User</th>
                <th className="px-2 py-1">Total Bets</th>
                <th className="px-2 py-1">Wins</th>
                <th className="px-2 py-1">Losses</th>
                <th className="px-2 py-1">Total Parlays</th>
                <th className="px-2 py-1">Parlays Won</th>
                <th className="px-2 py-1">Parlays Lost</th>
                <th className="px-2 py-1">Wagered</th>
                <th className="px-2 py-1">Won</th>
                <th className="px-2 py-1">Profit</th>
                <th className="px-2 py-1">ROI</th>
                <th className="px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((u: PublicUser) => {
                const s: UserStatsDTO | null = displayStats[u.id] ?? null;
                return (
                  <tr
                    key={u.id}
                    className="even:bg-surface odd:bg-background hover:bg-surface transition"
                  >
                    <td className="px-2 py-1">{u.name}</td>
                    {s ? (
                      <>
                        <td className="px-2 py-1">{s.totalBets}</td>
                        <td className="px-2 py-1">{s.betsWon}</td>
                        <td className="px-2 py-1">{s.betsLost}</td>
                        <td className="px-2 py-1">{s.totalParlays}</td>
                        <td className="px-2 py-1">{s.parlaysWon}</td>
                        <td className="px-2 py-1">{s.parlaysLost}</td>
                        <td className="px-2 py-1">${formatMuskBucks(s.totalWagered)}</td>
                        <td className="px-2 py-1">${formatMuskBucks(s.totalWinnings)}</td>
                        <td className="px-2 py-1">${formatMuskBucks(s.netProfit)}</td>
                        <td className="px-2 py-1">{(s.roi * 100).toFixed(1)}%</td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => loadUserStats?.(u.id)}
                            className="px-2 py-0.5 bg-primary text-surface rounded hover:opacity-90 transition"
                          >
                            Refresh
                          </button>
                        </td>
                      </>
                    ) : (
                      <td className="px-2 py-1 text-center" colSpan={11}>
                        <button
                          onClick={() => loadUserStats?.(u.id)}
                          className="px-2 py-0.5 bg-tertiary text-surface rounded hover:opacity-90 transition"
                        >
                          Load
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  // Panel mode: with tabs
  if (mode === 'panel' || showTabs) {
    return (
      <div className="bg-surface border border-muted rounded-2xl shadow-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-muted bg-background/50">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-surface text-content border-b-2 border-primary shadow-sm'
                    : 'text-tertiary hover:text-content hover:bg-surface/50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - Keep all tabs mounted but hidden for instant switching + caching */}
        <div className="min-h-[400px]">
          {/* Achievements Tab - Always mounted, hidden when not active */}
          <div className={`p-6 ${activeTab === 'achievements' ? '' : 'hidden'}`}>
            <ProfileAchievements
              achievements={profile?.achievements || (profile?.badges as any)}
              embedded={true}
            />
          </div>

          {/* Stats Tab - Always mounted, hidden when not active */}
          <div className={`p-6 ${activeTab === 'stats' ? '' : 'hidden'}`}>
            <ProfileStats
              profile={profile && { muskBucks: asNum(profile.muskBucks), rank: profile.rank }}
              stats={stats}
              isOwn={isOwn}
              mode="card"
              compact={true}
            />
          </div>

          {/* Pong Stats Tab - Always mounted, hidden when not active */}
          {profile?.id && (
            <div className={`p-6 ${activeTab === 'pong' ? '' : 'hidden'}`}>
              <ProfilePongStats
                userId={profile.id}
                isOwn={isOwn}
                userName={profile.name || 'User'}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Card mode: original display (style source of truth)
  if (!stats || !profile) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-4 sm:p-6 shadow-lg">
        <div className="text-center text-tertiary">No stats available</div>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface border border-muted rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 ${compact ? 'p-4' : 'p-4 sm:p-6'}`}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-content">User Stats Overview</h3>
      </div>

      {/* Quick Stats Summary - always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-secondary/10 rounded-xl">
        <div className="text-center">
          <div
            className={`text-lg font-bold flex items-center justify-center gap-1 px-2 py-1 rounded-full ${getMuskBucksColorClasses(profile.muskBucks)}`}
          >
            <span>{formatMuskBucks(profile.muskBucks)}</span>
            <span>🪙</span>
          </div>
          <div className="text-xs text-tertiary">MuskBucks</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-content">{totalGames}</div>
          <div className="text-xs text-tertiary">Total Bets</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-content">{(overallWinRate * 100).toFixed(1)}%</div>
          <div className="text-xs text-tertiary">Win Rate</div>
        </div>
        <div className="text-center">
          <div
            className={`text-lg font-bold ${asNum(stats?.netProfit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {asNum(stats?.netProfit) >= 0 ? '+' : ''}${formatMuskBucks(stats?.netProfit)}
          </div>
          <div className="text-xs text-tertiary">Profit</div>
        </div>
      </div>

      {/* Charts Section - Always Visible */}
      <div className="mt-6">
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-background/50 border border-muted rounded-xl p-4 hover:bg-background/70 transition-colors duration-200">
            <WinLossPieChart
              wins={totalWins}
              losses={(stats.betsLost || 0) + (stats.parlaysLost || 0)}
              title="Overall Win/Loss"
            />
          </div>

          <div className="bg-background/50 border border-muted rounded-xl p-4 hover:bg-background/70 transition-colors duration-200">
            <FinancialBarChart
              wagered={asNum(stats?.totalWagered)}
              won={asNum(stats?.totalWinnings)}
              profit={asNum(stats?.netProfit)}
            />
          </div>

          <div className="bg-background/50 border border-muted rounded-xl p-4 hover:bg-background/70 transition-colors duration-200">
            <PerformanceProgressBars
              roi={stats.roi || 0}
              betWinRate={betWinRate}
              parlayWinRate={parlayWinRate}
              parlayAccuracy={parlayAccuracy}
            />
          </div>
        </div>
      </div>

      {/* Raw Stats Section - collapsible */}
      <div className="border-t border-muted pt-4 mt-4">
        <h4
          className="text-base font-semibold mb-3 flex items-center gap-2 cursor-pointer"
          onClick={() => setShowRawStats(!showRawStats)}
        >
          <span>Detailed Statistics</span>
          <span className="text-tertiary">{showRawStats ? '▲' : '▼'}</span>
        </h4>

        {showRawStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-background/30 p-3 rounded">
              <div className="text-tertiary text-xs">Bets Won</div>
              <div className="font-semibold">{stats.betsWon || 0}</div>
            </div>
            <div className="bg-background/30 p-3 rounded">
              <div className="text-tertiary text-xs">Bets Lost</div>
              <div className="font-semibold">{stats.betsLost || 0}</div>
            </div>
            <div className="bg-background/30 p-3 rounded">
              <div className="text-tertiary text-xs">Total Wagered</div>
              <div className="font-semibold">${formatMuskBucks(stats.totalWagered)}</div>
            </div>
            <div className="bg-background/30 p-3 rounded">
              <div className="text-tertiary text-xs">Total Won</div>
              <div className="font-semibold">${formatMuskBucks(stats.totalWinnings)}</div>
            </div>
            <div className="bg-background/30 p-3 rounded">
              <div className="text-tertiary text-xs">Biggest Win</div>
              <div className="font-semibold">${formatMuskBucks(stats.biggestWin)}</div>
            </div>
            <div className="bg-background/30 p-3 rounded">
              <div className="text-tertiary text-xs">Current Streak</div>
              <div className="font-semibold">{stats.currentStreak || 0}</div>
            </div>
            <div className="bg-background/30 p-3 rounded">
              <div className="text-tertiary text-xs">Longest Win Streak</div>
              <div className="font-semibold">{stats.longestWinStreak || 0}</div>
            </div>
            <div className="bg-background/30 p-3 rounded">
              <div className="text-tertiary text-xs">ROI</div>
              <div
                className={`font-semibold ${(stats.roi || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {((stats.roi || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Convenience exports for backward compatibility
export function ProfileStatsPanel(props: ProfileStatsProps) {
  return <ProfileStats {...props} mode="panel" showTabs={true} />;
}

export function AdminUserStats() {
  return <ProfileStats mode="admin" />;
}
