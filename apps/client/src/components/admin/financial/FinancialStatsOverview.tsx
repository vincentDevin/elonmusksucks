import React from 'react';
import { formatMuskBucks } from '../../../utils/formatting';

interface FinancialStatsProps {
  stats: {
    totalBets: number;
    totalTransactions: number;
    totalBetAmount: number;
    totalPayout: number;
    refundedAmount: number;
    netRevenue: number;
  };
  className?: string;
}

const FinancialStatsOverview: React.FC<FinancialStatsProps> = ({ stats, className = '' }) => {
  const statItems = [
    {
      label: 'Bets',
      value: stats.totalBets.toLocaleString(),
      icon: '🎯',
      color: 'text-blue-600',
    },
    {
      label: 'Transactions',
      value: stats.totalTransactions.toLocaleString(),
      icon: '💳',
      color: 'text-purple-600',
    },
    {
      label: 'Volume',
      value: `$${formatMuskBucks(stats.totalBetAmount)}`,
      icon: '💰',
      color: 'text-green-600',
    },
    {
      label: 'Payouts',
      value: `$${formatMuskBucks(stats.totalPayout)}`,
      icon: '💸',
      color: 'text-orange-600',
    },
    {
      label: 'Refunded',
      value: `$${formatMuskBucks(stats.refundedAmount)}`,
      icon: '🔄',
      color: 'text-yellow-600',
    },
    {
      label: 'Net Revenue',
      value: `$${formatMuskBucks(stats.netRevenue)}`,
      icon: '📈',
      color: stats.netRevenue >= 0 ? 'text-green-600' : 'text-red-600',
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`}>
      {statItems.map((item, index) => (
        <div
          key={index}
          className="bg-surface p-3 rounded-lg border border-muted hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg opacity-60">{item.icon}</span>
            <div className={`text-sm font-bold ${item.color} truncate`}>{item.value}</div>
          </div>
          <div className="text-xs font-medium text-tertiary truncate">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

export default FinancialStatsOverview;
