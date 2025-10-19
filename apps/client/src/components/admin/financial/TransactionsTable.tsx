import React from 'react';
import { formatMuskBucks } from '../../../utils/formatting';
import type { AdminTransactionView } from '@ems/types';

interface TransactionsTableProps {
  transactions: AdminTransactionView[];
  className?: string;
}

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions, className = '' }) => {
  const getCategoryBadge = (subtype?: string | null) => {
    if (!subtype)
      return {
        color: 'bg-muted/50 text-content dark:bg-muted/30',
        icon: '💳',
        label: 'Other',
      };

    if (subtype.includes('PONG')) {
      return {
        color: 'bg-purple-500/20 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400',
        icon: '🏓',
        label: subtype.replace('_', ' '),
      };
    }
    if (subtype.includes('PARLAY')) {
      return {
        color: 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-400',
        icon: '🔗',
        label: subtype.replace('_', ' '),
      };
    }
    if (subtype.includes('BET')) {
      return {
        color: 'bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-400',
        icon: '🎯',
        label: subtype.replace('_', ' '),
      };
    }
    return {
      color: 'bg-muted/50 text-content dark:bg-muted/30',
      icon: '💳',
      label: subtype.replace('_', ' '),
    };
  };

  const getRelatedBadge = (tx: AdminTransactionView) => {
    if (tx.relatedBetId) {
      return {
        color: 'bg-orange-500/15 text-orange-700 dark:bg-orange-500/25 dark:text-orange-400',
        icon: '🎯',
        label: `Bet #${tx.relatedBetId}`,
      };
    }
    if (tx.relatedParlayId) {
      return {
        color: 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-400',
        icon: '🔗',
        label: `Parlay #${tx.relatedParlayId}`,
      };
    }
    if (tx.relatedPongMatchId) {
      return {
        color: 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/25 dark:text-purple-400',
        icon: '🏓',
        label: `Pong #${tx.relatedPongMatchId}`,
      };
    }
    return null;
  };

  return (
    <div className={`bg-surface rounded-lg border border-muted overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase tracking-wider">
                User
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase tracking-wider">
                Category
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase tracking-wider">
                Amount
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase tracking-wider">
                Description
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase tracking-wider">
                Related
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/50">
            {transactions.map((tx) => {
              const categoryBadge = getCategoryBadge(tx.subtype);
              const relatedBadge = getRelatedBadge(tx);

              return (
                <tr key={`tx-${tx.id}`} className="hover:bg-background/50 transition-colors">
                  <td className="px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      {tx.userAvatarUrl ? (
                        <img
                          src={tx.userAvatarUrl}
                          alt={tx.userName || 'User'}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {tx.userName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div
                          className="font-medium text-content truncate max-w-24"
                          title={tx.userName}
                        >
                          {tx.userName}
                        </div>
                        <div className="text-tertiary truncate max-w-24" title={tx.userEmail}>
                          {tx.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${categoryBadge.color}`}
                    >
                      <span className="text-xs">{categoryBadge.icon}</span>
                      {categoryBadge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        tx.type === 'CREDIT'
                          ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-400'
                          : 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-400'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '⬆️' : '⬇️'}
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold">
                    <span
                      className={
                        tx.type === 'CREDIT'
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}$
                      {formatMuskBucks(Math.abs(asNum(tx.amount)))}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-content max-w-32">
                    <div className="truncate" title={tx.description || ''}>
                      {tx.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {relatedBadge ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${relatedBadge.color}`}
                      >
                        <span className="text-xs">{relatedBadge.icon}</span>
                        {relatedBadge.label}
                      </span>
                    ) : (
                      <span className="text-tertiary">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-tertiary">
                    <div className="flex flex-col">
                      <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs opacity-70">
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-8 text-tertiary">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm">No transactions found</div>
        </div>
      )}
    </div>
  );
};

export default TransactionsTable;
