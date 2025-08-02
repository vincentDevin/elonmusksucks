// apps/client/src/components/dashboard/analytics/PerformanceMetricsCard.tsx
import { useMemo } from 'react';
import type { EnhancedUserStats } from '../../../hooks/useEnhancedUserStats';

interface PerformanceMetricsCardProps {
  stats: EnhancedUserStats;
  className?: string;
}

export default function PerformanceMetricsCard({
  stats,
  className = '',
}: PerformanceMetricsCardProps) {
  const { performance } = stats;

  // Calculate trend indicators (placeholder for now)
  const winRateTrend = useMemo(() => {
    // In real implementation, compare with previous period
    return performance.winRate > 0.5 ? 'up' : performance.winRate > 0.3 ? 'neutral' : 'down';
  }, [performance.winRate]);

  const profitTrend = useMemo(() => {
    return performance.profitLoss > 0 ? 'up' : performance.profitLoss === 0 ? 'neutral' : 'down';
  }, [performance.profitLoss]);

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatCurrency = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}🪙`;

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'neutral' }) => {
    if (trend === 'up') return <span className="text-green-500">↗</span>;
    if (trend === 'down') return <span className="text-red-500">↘</span>;
    return <span className="text-gray-500">→</span>;
  };

  return (
    <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
      <h3 className="font-semibold text-content mb-3 flex items-center">📈 Performance Metrics</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Win Rate */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-tertiary">Win Rate</span>
            <TrendIcon trend={winRateTrend} />
          </div>
          <div className="text-lg font-bold text-content">{formatPercent(performance.winRate)}</div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${Math.min(performance.winRate * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Profit/Loss */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-tertiary">Profit/Loss</span>
            <TrendIcon trend={profitTrend} />
          </div>
          <div
            className={`text-lg font-bold ${
              performance.profitLoss > 0
                ? 'text-green-500'
                : performance.profitLoss < 0
                  ? 'text-red-500'
                  : 'text-content'
            }`}
          >
            {formatCurrency(performance.profitLoss)}
          </div>
          <div className="text-xs text-tertiary">Avg: {formatCurrency(performance.avgBetSize)}</div>
        </div>

        {/* Total Bets */}
        <div className="space-y-1">
          <span className="text-sm text-tertiary">Total Bets</span>
          <div className="text-lg font-bold text-content">
            {performance.totalBets.toLocaleString()}
          </div>
          <div className="text-xs text-tertiary">
            {formatCurrency(performance.totalWagered)} wagered
          </div>
        </div>

        {/* Current Streak */}
        <div className="space-y-1">
          <span className="text-sm text-tertiary">Current Streak</span>
          <div
            className={`text-lg font-bold flex items-center ${
              performance.currentStreak.type === 'win' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {performance.currentStreak.isActive ? (
              <>
                <span className="animate-pulse mr-1">🔥</span>
                {performance.currentStreak.count}
              </>
            ) : (
              <span className="text-tertiary">None</span>
            )}
          </div>
          <div className="text-xs text-tertiary">
            {performance.currentStreak.type === 'win' ? 'Wins' : 'Losses'}
          </div>
        </div>
      </div>

      {/* Best Category */}
      {performance.bestCategory && performance.accuracyByCategory.length > 0 && (
        <div className="mt-4 pt-3 border-t border-muted">
          <div className="flex items-center justify-between">
            <span className="text-sm text-tertiary">Best Category</span>
            <span className="text-sm font-medium text-primary">{performance.bestCategory}</span>
          </div>
          {(() => {
            const bestCat = performance.accuracyByCategory.find(
              (c) => c.category === performance.bestCategory,
            );
            return bestCat ? (
              <div className="text-xs text-tertiary mt-1">
                {formatPercent(bestCat.accuracy)} accuracy ({bestCat.wins}/{bestCat.totalBets})
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
