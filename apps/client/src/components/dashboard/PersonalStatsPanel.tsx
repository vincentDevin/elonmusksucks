// apps/client/src/components/dashboard/PersonalStatsPanel.tsx
import { memo } from 'react';
import { useUserStats } from '../../hooks/useUserStats';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import MetricsCard from './analytics/PerformanceMetricsCard';
import StatsGrid from './analytics/QuickStatsGrid';
import SmartInsights from './analytics/SmartInsights';

const PersonalStatsPanel = memo(function PersonalStatsPanel() {
  const { stats, loading, error, smartInsights } = useUserStats();
  const { userRank } = useLeaderboard('all-time');

  if (loading) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 text-content flex items-center">
          <span className="mr-2">📊</span>
          Personal Stats
        </h2>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 text-content flex items-center">
          <span className="mr-2">📊</span>
          Personal Stats
        </h2>
        <div className="text-center py-8">
          <p className="text-red-500">{error || 'Failed to load stats'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-muted rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-6 text-content flex items-center">
        <span className="mr-2">📊</span>
        Personal Stats
      </h2>

      <div className="space-y-6">
        {/* Performance Metrics */}
        <MetricsCard stats={stats} />

        {/* Quick Stats Grid */}
        <StatsGrid stats={stats} userRank={userRank} />

        {/* Smart Insights */}
        <SmartInsights insights={smartInsights || []} />
      </div>
    </div>
  );
});

export default PersonalStatsPanel;
