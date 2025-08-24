// apps/client/src/components/dashboard/analytics/QuickStatsGrid.tsx
import { useMemo, memo } from 'react';
import type { EnhancedUserStats } from '../../../hooks/useEnhancedUserStats';

interface QuickStatsGridProps {
  stats: EnhancedUserStats;
  userRank?: { allTimeRank: number | null; dailyRank: number | null } | null;
  className?: string;
}

interface StatItem {
  label: string;
  value: string;
  change?: number;
  icon: string;
  color: string;
  subtext?: string;
}

const QuickStatsGrid = memo(function QuickStatsGrid({
  stats,
  userRank,
  className = '',
}: QuickStatsGridProps) {
  const quickStats = useMemo((): StatItem[] => {
    if (!stats || !stats.portfolio || !stats.ranking || !stats.achievements || !stats.performance) {
      // Return empty stats if data is not available
      return [];
    }

    const { portfolio, ranking, achievements, performance } = stats;

    // Use userRank from leaderboard hook if available, otherwise fall back to stats
    const currentRank = userRank?.allTimeRank || ranking.currentPosition;
    const hasRank = currentRank && currentRank > 0;

    // Ensure portfolio values are numbers to prevent toFixed errors
    const safePortfolioValue = Number(portfolio.totalPortfolioValue) || 0;
    const safeActiveBetsValue = Number(portfolio.activeBetsValue) || 0;
    const safeActiveParlaysValue = Number(portfolio.activeParlaysValue) || 0;
    const safePotentialWinnings = Number(portfolio.potentialWinnings) || 0;

    return [
      {
        label: 'Portfolio Value',
        value: `${safePortfolioValue.toFixed(0)}🪙`,
        change: safePortfolioValue > 0 ? 1 : 0,
        icon: '💼',
        color: 'text-blue-500',
        subtext: `${safeActiveBetsValue.toFixed(0)}🪙 bets + ${safeActiveParlaysValue.toFixed(0)}🪙 parlays`,
      },
      {
        label: 'Leaderboard Rank',
        value: hasRank ? `#${currentRank}` : 'Unranked',
        change: ranking.positionChange,
        icon: '🏆',
        color:
          currentRank <= 10
            ? 'text-yellow-500'
            : currentRank <= 50
              ? 'text-orange-500'
              : 'text-gray-500',
        subtext: hasRank
          ? `Top ${ranking.percentile}%${ranking.positionChange > 0 ? ` (+${ranking.positionChange})` : ''}`
          : 'Start playing to rank up',
      },
      {
        label: 'Active Bets',
        value:
          safeActiveBetsValue > 0
            ? `${Math.round(safeActiveBetsValue / (performance.avgBetSize || 1))}`
            : '0',
        icon: '🎯',
        color: 'text-green-500',
        subtext: `${safeActiveBetsValue.toFixed(0)}🪙 total`,
      },
      {
        label: 'Badges Earned',
        value: achievements.totalBadges.toString(),
        icon: '🏅',
        color: 'text-purple-500',
        subtext: `${(achievements.completionRate * 100).toFixed(0)}% complete`,
      },
      {
        label: 'Pending Predictions',
        value: portfolio.pendingPredictions.toString(),
        icon: '⏳',
        color: portfolio.pendingPredictions > 0 ? 'text-amber-500' : 'text-gray-500',
        subtext: `${(portfolio.approvalRate * 100).toFixed(0)}% approval rate`,
      },
      {
        label: 'Potential Winnings',
        value: `${safePotentialWinnings.toFixed(0)}🪙`,
        icon: '💰',
        color: safePotentialWinnings > 0 ? 'text-green-500' : 'text-gray-500',
        subtext: safePotentialWinnings > 0 ? 'From active parlays' : 'No active parlays',
      },
    ];
  }, [stats, userRank]);

  const ChangeIndicator = ({ change }: { change?: number }) => {
    if (!change || change === 0) return null;

    return (
      <span className={`text-xs ml-1 ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
        {change > 0 ? '↗' : '↘'}
      </span>
    );
  };

  return (
    <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
      <h3 className="font-semibold text-content mb-3 flex items-center">📊 Quick Stats</h3>

      <div className="space-y-2">
        {quickStats.length === 0 ? (
          <div className="text-center text-tertiary py-4">
            <div className="text-sm">Loading statistics...</div>
          </div>
        ) : (
          quickStats.map((stat, _index) => (
            <div
              key={stat.label}
              className="bg-surface rounded-lg p-3 border border-muted hover:border-primary/30 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
                <div className="space-y-0.5">
                  <div className="text-xs text-tertiary font-medium">{stat.label}</div>
                  {stat.subtext && (
                    <div className="text-xs text-tertiary opacity-75">{stat.subtext}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <div className="text-lg font-bold text-content leading-tight">{stat.value}</div>
                <ChangeIndicator change={stat.change} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Next Milestone */}
      {stats && stats.ranking && stats.ranking.nextMilestone && (
        <div className="mt-4 pt-3 border-t border-muted">
          <div className="flex items-center justify-between">
            <span className="text-sm text-tertiary">Next Milestone</span>
            <span className="text-sm font-medium text-primary">
              #{stats.ranking.nextMilestone.rank}
            </span>
          </div>
          <div className="text-xs text-tertiary mt-1">
            {stats.ranking.nextMilestone.requirement}
          </div>
        </div>
      )}
    </div>
  );
});

export default QuickStatsGrid;
