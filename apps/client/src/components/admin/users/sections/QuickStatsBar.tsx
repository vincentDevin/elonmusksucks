import React from 'react';
import { formatMuskBucks } from '../../../../utils/formatting';
import type { UserStatsDTO } from '@ems/types';

interface QuickStatsBarProps {
  stats: UserStatsDTO | null;
  balance?: number;
}

const QuickStatsBar: React.FC<QuickStatsBarProps> = ({ stats, balance = 0 }) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-background border-b border-muted">
        <div className="text-center p-3 bg-surface rounded-lg border border-muted">
          <div className="h-6 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-background border-b border-muted">
      <div className="text-center p-3 bg-surface rounded-lg border border-muted">
        <div className="text-2xl font-bold text-primary">${formatMuskBucks(balance)}</div>
        <div className="text-xs text-tertiary mt-1">Balance</div>
      </div>

      <div className="text-center p-3 bg-surface rounded-lg border border-muted">
        <div className="text-2xl font-bold text-blue-600">{stats.totalBets || 0}</div>
        <div className="text-xs text-tertiary mt-1">Total Bets</div>
      </div>

      <div className="text-center p-3 bg-surface rounded-lg border border-muted">
        <div className="text-2xl font-bold text-green-600">
          {stats.winRate ? `${stats.winRate.toFixed(1)}%` : '0%'}
        </div>
        <div className="text-xs text-tertiary mt-1">Win Rate</div>
      </div>

      <div className="text-center p-3 bg-surface rounded-lg border border-muted">
        <div
          className={`text-2xl font-bold ${Number(stats.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          ${formatMuskBucks(Math.abs(Number(stats.netProfit || 0)))}
        </div>
        <div className="text-xs text-tertiary mt-1">
          {Number(stats.netProfit || 0) >= 0 ? 'Net Profit' : 'Net Loss'}
        </div>
      </div>

      <div className="text-center p-3 bg-surface rounded-lg border border-muted">
        <div className="text-2xl font-bold text-purple-600">{stats.totalParlays || 0}</div>
        <div className="text-xs text-tertiary mt-1">Parlays</div>
      </div>
    </div>
  );
};

export default QuickStatsBar;
