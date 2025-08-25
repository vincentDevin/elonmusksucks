// apps/client/src/components/dashboard/MyStuffPanel.tsx
import { useState, memo } from 'react';
import { useUserStats } from '../../hooks/useUserStats';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import MetricsCard from './analytics/PerformanceMetricsCard';
import StatsGrid from './analytics/QuickStatsGrid';
import SmartInsights from './analytics/SmartInsights';
import AchievementProgress from './analytics/AchievementProgress';

type ViewMode = 'analytics' | 'activity';

const MyStuffPanel = memo(function MyStuffPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const { stats, loading, error, smartInsights } = useUserStats();
  const { userRank } = useLeaderboard('all-time');

  if (loading) {
    return (
      <section className="bg-surface border border-muted rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-content">Personal Command Center</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <span className="ml-3 text-tertiary">Loading your analytics...</span>
        </div>
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className="bg-surface border border-muted rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-content">Personal Command Center</h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-500 mb-4">{error || 'Failed to load analytics'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface border border-muted rounded-2xl p-6 shadow-lg">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-content flex items-center">
          <span className="mr-2">🏛️</span>
          Personal Command Center
        </h2>

        <div className="flex bg-background rounded-lg p-1 border border-muted">
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'analytics'
                ? 'bg-primary text-white shadow-sm'
                : 'text-tertiary hover:text-content'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setViewMode('activity')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'activity'
                ? 'bg-primary text-white shadow-sm'
                : 'text-tertiary hover:text-content'
            }`}
          >
            Activity
          </button>
        </div>
      </div>

      {viewMode === 'analytics' ? (
        /* Analytics View */
        <div className="space-y-6">
          {/* Performance Metrics - Full Width */}
          <MetricsCard stats={stats} />

          {/* Quick Stats Grid - Full Width */}
          <StatsGrid stats={stats} userRank={userRank} />

          {/* Smart Insights - Full Width */}
          <SmartInsights insights={smartInsights || []} />

          {/* Achievement Progress - Full Width */}
          <AchievementProgress stats={stats} />
        </div>
      ) : (
        /* Legacy Activity View */
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2 text-content">Open Bets</h3>
            {stats.portfolio.activeBetsValue === 0 ? (
              <p className="text-tertiary text-sm italic">No open bets</p>
            ) : (
              <div className="bg-background/50 rounded-lg p-3 border border-muted">
                <div className="text-sm text-content">
                  You have active bets worth{' '}
                  <span className="font-bold text-primary">
                    {stats.portfolio.activeBetsValue}🪙
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2 text-content">Active Parlays</h3>
            {stats.portfolio.activeParlaysValue === 0 ? (
              <p className="text-tertiary text-sm italic">No active parlays</p>
            ) : (
              <div className="bg-background/50 rounded-lg p-3 border border-muted">
                <div className="text-sm text-content">
                  Active parlays worth{' '}
                  <span className="font-bold text-primary">
                    {stats.portfolio.activeParlaysValue}🪙
                  </span>
                  <br />
                  <span className="text-tertiary">
                    Potential winnings: {stats.portfolio.potentialWinnings}🪙
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2 text-content">My Predictions</h3>
            {stats.portfolio.pendingPredictions === 0 ? (
              <p className="text-tertiary text-sm italic">No pending predictions</p>
            ) : (
              <div className="bg-background/50 rounded-lg p-3 border border-muted">
                <div className="text-sm text-content">
                  {stats.portfolio.pendingPredictions} predictions pending approval
                  <br />
                  <span className="text-tertiary">
                    Approval rate: {(stats.portfolio.approvalRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
});

export default MyStuffPanel;
