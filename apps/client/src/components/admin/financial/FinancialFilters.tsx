import React, { useState } from 'react';

interface FilterState {
  search: string;
  userId?: number;
  predictionId?: number;
  betType: string[];
  status: string[];
  transactionType: string[];
  transactionSubtype: string[];
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  suspiciousOnly: boolean;
  includePongTransactions: boolean;
  includeMetadata: boolean;
  sortBy: 'createdAt' | 'amount' | 'potentialPayout' | 'userName' | 'profit';
  sortOrder: 'asc' | 'desc';
}

interface FinancialFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  activeTab: string;
  className?: string;
}

const FinancialFilters: React.FC<FinancialFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  activeTab,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.userId ||
      filters.predictionId ||
      filters.betType.length > 0 ||
      filters.status.length > 0 ||
      filters.transactionType.length > 0 ||
      filters.transactionSubtype.length > 0 ||
      filters.minAmount ||
      filters.maxAmount ||
      filters.startDate ||
      filters.endDate ||
      filters.suspiciousOnly ||
      !filters.includePongTransactions ||
      !filters.includeMetadata
    );
  };

  return (
    <div className={`bg-surface border border-muted rounded-lg ${className}`}>
      {/* Collapsed Header */}
      <div className="px-4 py-3 border-b border-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-content hover:text-primary transition-colors"
            >
              <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
              Filters & Search
            </button>
            {hasActiveFilters() && (
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">Active</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search - Always Visible */}
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Quick search..."
              className="w-48 px-3 py-1 text-sm border border-muted rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-content placeholder-tertiary"
            />

            {hasActiveFilters() && (
              <button
                onClick={onClearFilters}
                className="text-xs text-tertiary hover:text-content px-2 py-1 rounded border border-muted hover:border-primary transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Amount Range */}
            <div>
              <label className="block text-xs font-medium text-content mb-1">Amount Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      minAmount: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Min"
                  className="w-full px-2 py-1 text-sm border border-muted rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-content placeholder-tertiary"
                />
                <input
                  type="number"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      maxAmount: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Max"
                  className="w-full px-2 py-1 text-sm border border-muted rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-content placeholder-tertiary"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-content mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => onFiltersChange({ startDate: e.target.value || undefined })}
                  className="w-full px-2 py-1 text-sm border border-muted rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-content"
                />
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => onFiltersChange({ endDate: e.target.value || undefined })}
                  className="w-full px-2 py-1 text-sm border border-muted rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-content"
                />
              </div>
            </div>

            {/* Status Filter */}
            {activeTab === 'bets' && (
              <div>
                <label className="block text-xs font-medium text-content mb-1">Bet Status</label>
                <select
                  multiple
                  value={filters.status}
                  onChange={(e) =>
                    onFiltersChange({
                      status: Array.from(e.target.selectedOptions, (option) => option.value),
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-muted rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-content"
                  size={3}
                >
                  <option value="pending">Pending</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            )}

            {/* Transaction Type Filter */}
            {(activeTab === 'transactions' || activeTab === 'unified') && (
              <div>
                <label className="block text-xs font-medium text-content mb-1">Type</label>
                <select
                  multiple
                  value={filters.transactionType}
                  onChange={(e) =>
                    onFiltersChange({
                      transactionType: Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      ),
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-muted rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-content"
                  size={2}
                >
                  <option value="DEBIT">Debit</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
            )}

            {/* Transaction Subtype Filter */}
            {(activeTab === 'transactions' || activeTab === 'unified' || activeTab === 'pong') && (
              <div>
                <label className="block text-xs font-medium text-content mb-1">Category</label>
                <select
                  multiple
                  value={filters.transactionSubtype}
                  onChange={(e) =>
                    onFiltersChange({
                      transactionSubtype: Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      ),
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-muted rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-content"
                  size={4}
                >
                  <option value="BET_WAGER">Bet Wagers</option>
                  <option value="BET_PAYOUT">Bet Payouts</option>
                  <option value="PARLAY_WAGER">Parlay Wagers</option>
                  <option value="PARLAY_PAYOUT">Parlay Payouts</option>
                  <option value="PONG_WAGER">Pong Wagers</option>
                  <option value="PONG_PAYOUT">Pong Payouts</option>
                </select>
              </div>
            )}

            {/* Data Options */}
            <div>
              <label className="block text-xs font-medium text-content mb-1">Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={filters.includePongTransactions}
                    onChange={(e) => onFiltersChange({ includePongTransactions: e.target.checked })}
                    className="w-3 h-3 text-primary border-muted rounded focus:ring-primary focus:ring-1"
                  />
                  Include Pong
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={filters.includeMetadata}
                    onChange={(e) => onFiltersChange({ includeMetadata: e.target.checked })}
                    className="w-3 h-3 text-primary border-muted rounded focus:ring-primary focus:ring-1"
                  />
                  Rich Metadata
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={filters.suspiciousOnly}
                    onChange={(e) => onFiltersChange({ suspiciousOnly: e.target.checked })}
                    className="w-3 h-3 text-primary border-muted rounded focus:ring-primary focus:ring-1"
                  />
                  Suspicious Only
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialFilters;
