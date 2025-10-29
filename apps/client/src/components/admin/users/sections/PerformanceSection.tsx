import React from 'react';
import { formatMuskBucks } from '../../../../utils/formatting';
import type { UserStatsDTO } from '@ems/types';

interface PerformanceSectionProps {
  stats: UserStatsDTO | null;
  userId: number;
}

const PerformanceSection: React.FC<PerformanceSectionProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const performanceMetrics = [
    { label: 'Total Bets', value: stats.totalBets || 0, color: 'text-blue-600' },
    { label: 'Bets Won', value: stats.betsWon || 0, color: 'text-green-600' },
    { label: 'Bets Lost', value: stats.betsLost || 0, color: 'text-red-600' },
    { label: 'Current Streak', value: stats.currentStreak || 0, color: 'text-yellow-600' },
  ];

  const netProfitNum = Number(stats.netProfit || 0);
  const financialMetrics = [
    {
      label: 'Total Wagered',
      value: `$${formatMuskBucks(Number(stats.totalWagered || 0))}`,
      color: 'text-blue-600',
    },
    {
      label: 'Total Winnings',
      value: `$${formatMuskBucks(Number(stats.totalWinnings || 0))}`,
      color: 'text-green-600',
    },
    {
      label: 'Net Profit',
      value: `$${formatMuskBucks(netProfitNum)}`,
      color: netProfitNum >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'ROI',
      value: `${(stats.roi || 0).toFixed(2)}%`,
      color: (stats.roi || 0) >= 0 ? 'text-green-600' : 'text-red-600',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-content mb-4">Betting Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {performanceMetrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-background rounded-lg p-4 border border-muted text-center"
            >
              <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
              <div className="text-sm text-tertiary mt-1">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-content mb-4">Financial Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {financialMetrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-background rounded-lg p-4 border border-muted text-center"
            >
              <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
              <div className="text-sm text-tertiary mt-1">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-background rounded-lg p-4 border border-muted">
        <h3 className="text-sm font-semibold text-content mb-3">Win Rate Analysis</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-tertiary">Overall Win Rate:</span>
            <span className="font-semibold text-content">{(stats.winRate || 0).toFixed(2)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(stats.winRate || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceSection;
