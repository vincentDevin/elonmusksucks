// apps/client/src/components/dashboard/QuickStatsPanel.tsx
import { memo } from 'react';
import { useUserStats } from '../../hooks/useUserStats';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import StatsGrid from './analytics/QuickStatsGrid';

const QuickStatsPanel = memo(function QuickStatsPanel() {
  const { stats, loading, error } = useUserStats();
  const { userRank } = useLeaderboard('all-time');

  if (loading) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-6">
        <div className="text-center py-4">
          <p className="text-red-500">{error || 'Failed to load stats'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-muted rounded-2xl p-6">
      <StatsGrid stats={stats} userRank={userRank} />
    </div>
  );
});

export default QuickStatsPanel;
