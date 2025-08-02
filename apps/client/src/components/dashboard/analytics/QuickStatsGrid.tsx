// apps/client/src/components/dashboard/analytics/QuickStatsGrid.tsx
import { useMemo } from 'react';
import type { EnhancedUserStats } from '../../../hooks/useEnhancedUserStats';

interface QuickStatsGridProps {
  stats: EnhancedUserStats;
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

export default function QuickStatsGrid({ stats, className = '' }: QuickStatsGridProps) {
  const quickStats = useMemo((): StatItem[] => {
    const { portfolio, ranking, achievements, performance } = stats;

    return [
      {
        label: 'Portfolio Value',
        value: `${portfolio.totalPortfolioValue.toFixed(0)}🪙`,
        change: portfolio.totalPortfolioValue > 0 ? 1 : 0,
        icon: '💼',
        color: 'text-blue-500',
        subtext: `${portfolio.activeBetsValue}🪙 bets + ${portfolio.activeParlaysValue}🪙 parlays`,
      },
      {
        label: 'Leaderboard Rank',
        value: ranking.currentPosition > 0 ? `#${ranking.currentPosition}` : 'Unranked',
        change: ranking.positionChange,
        icon: '🏆',
        color:
          ranking.currentPosition <= 10
            ? 'text-yellow-500'
            : ranking.currentPosition <= 50
              ? 'text-orange-500'
              : 'text-gray-500',
        subtext: `Top ${ranking.percentile}%${ranking.positionChange > 0 ? ` (+${ranking.positionChange})` : ''}`,
      },
      {
        label: 'Active Bets',
        value:
          portfolio.activeBetsValue > 0
            ? `${Math.round(portfolio.activeBetsValue / performance.avgBetSize || 1)}`
            : '0',
        icon: '🎯',
        color: 'text-green-500',
        subtext: `${portfolio.activeBetsValue}🪙 total`,
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
        value: `${portfolio.potentialWinnings.toFixed(0)}🪙`,
        icon: '💰',
        color: portfolio.potentialWinnings > 0 ? 'text-green-500' : 'text-gray-500',
        subtext: portfolio.potentialWinnings > 0 ? 'From active parlays' : 'No active parlays',
      },
    ];
  }, [stats]);

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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {quickStats.map((stat, _index) => (
          <div
            key={stat.label}
            className="bg-surface rounded-lg p-3 border border-muted hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
              <ChangeIndicator change={stat.change} />
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold text-content leading-tight">{stat.value}</div>
              <div className="text-xs text-tertiary font-medium">{stat.label}</div>
              {stat.subtext && (
                <div className="text-xs text-tertiary opacity-75">{stat.subtext}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Next Milestone */}
      {stats.ranking.nextMilestone && (
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
}
