import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatMuskBucks } from '../../../utils/formatting';
import { useEventBusCore } from '../../../contexts/EventBusCoreContext';
import {
  searchFinancialData,
  getFinancialAnalytics,
  bulkFinancialOperation,
  exportFinancialData,
  type FinancialSearchParams,
} from '../../../api/admin';
import {
  REDIS_CHANNELS,
  type AdminFinancialAnalyticsResponse,
  type AdminFinancialDataResponse,
  type AdminBetView,
} from '@ems/types';

// Sub-components
import FinancialStatsOverview from './FinancialStatsOverview';
import FinancialFilters from './FinancialFilters';
import TransactionsTable from './TransactionsTable';
import CompactPagination from './CompactPagination';
import FinancialTabs from './FinancialTabs';

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

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

const initialFilters: FilterState = {
  search: '',
  betType: [],
  status: [],
  transactionType: [],
  transactionSubtype: [],
  suspiciousOnly: false,
  includePongTransactions: true,
  includeMetadata: true,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

interface FinancialDashboardProps {
  className?: string;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ className = '' }) => {
  const { subscribe, socket } = useEventBusCore();
  const hasJoinedRoom = useRef(false);

  // Tab and filter state
  const [activeTab, setActiveTab] = useState<
    'overview' | 'unified' | 'bets' | 'transactions' | 'pong'
  >('overview');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Data states
  const [financialData, setFinancialData] = useState<AdminFinancialDataResponse | null>(null);
  const [analytics, setAnalytics] = useState<AdminFinancialAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time state
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  // Selection and operations
  const [selectedBets, setSelectedBets] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Load financial data
  const loadFinancialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams: FinancialSearchParams = {
        search: filters.search || undefined,
        userId: filters.userId,
        predictionId: filters.predictionId,
        betType:
          filters.betType.length > 0 ? (filters.betType as ('single' | 'parlay')[]) : undefined,
        status:
          filters.status.length > 0
            ? (filters.status as ('pending' | 'won' | 'lost' | 'refunded')[])
            : undefined,
        transactionType:
          filters.transactionType.length > 0
            ? (filters.transactionType as ('DEBIT' | 'CREDIT')[])
            : undefined,
        transactionSubtype:
          filters.transactionSubtype.length > 0
            ? (filters.transactionSubtype as (
                | 'BET_WAGER'
                | 'BET_PAYOUT'
                | 'PARLAY_WAGER'
                | 'PARLAY_PAYOUT'
                | 'PONG_WAGER'
                | 'PONG_PAYOUT'
              )[])
            : undefined,
        includePongTransactions: filters.includePongTransactions,
        includeMetadata: filters.includeMetadata,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        startDate: filters.startDate,
        endDate: filters.endDate,
        suspiciousOnly: filters.suspiciousOnly,
        page: currentPage,
        limit: pageSize,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      const data = await searchFinancialData(searchParams);
      setFinancialData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const analyticsData = await getFinancialAnalytics({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  // Load data on filter changes
  useEffect(() => {
    loadFinancialData();
  }, [filters, currentPage, pageSize]);

  // Load analytics on tab change or date filter changes
  useEffect(() => {
    if (activeTab === 'overview') {
      loadAnalytics();
    }
  }, [activeTab, filters.startDate, filters.endDate]);

  // Single socket room join on mount (fixes spam issue)
  useEffect(() => {
    if (!socket || hasJoinedRoom.current) return;

    socket.emit('join', 'admin');
    hasJoinedRoom.current = true;

    return () => {
      if (hasJoinedRoom.current) {
        socket.emit('leave', 'admin');
        hasJoinedRoom.current = false;
      }
    };
  }, [socket]);

  // Real-time event listeners (separate from room management)
  useEffect(() => {
    if (!realtimeEnabled) return;

    const handleFinancialUpdate = () => {
      setLastUpdateTime(new Date().toLocaleTimeString());
      // Debounced refresh to avoid excessive API calls
      setTimeout(() => {
        if (realtimeEnabled) {
          loadFinancialData();
        }
      }, 1000);
    };

    // Register event listeners
    const unsubscribers = [
      subscribe(REDIS_CHANNELS.BET_PLACED, handleFinancialUpdate),
      subscribe(REDIS_CHANNELS.PARLAY_PLACED, handleFinancialUpdate),
      subscribe(REDIS_CHANNELS.BET_STATUS_CHANGE, handleFinancialUpdate),
      subscribe(REDIS_CHANNELS.PARLAY_STATUS_CHANGE, handleFinancialUpdate),
      subscribe(REDIS_CHANNELS.PONG_STATS_UPDATE, handleFinancialUpdate),
      subscribe(REDIS_CHANNELS.ADMIN_METRICS_UPDATE, handleFinancialUpdate),
      subscribe(REDIS_CHANNELS.USER_STATS_UPDATE, handleFinancialUpdate),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [subscribe, realtimeEnabled]);

  // Handle filter changes
  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(0); // Reset to first page
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(0);
  };

  // Handle bulk operations
  const handleBulkRefund = async () => {
    if (selectedBets.size === 0) return;

    setBulkLoading(true);
    try {
      const result = await bulkFinancialOperation({
        betIds: Array.from(selectedBets),
        operation: 'refund',
        params: { reason: 'Admin bulk refund' },
      });

      alert(
        `Refunded ${result.successCount} bets. Total refunded: $${formatMuskBucks(result.totalRefunded || 0)}`,
      );
      setSelectedBets(new Set());
      loadFinancialData(); // Reload data
    } catch (err) {
      alert('Bulk refund failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle data export
  const handleExport = async (
    format: 'csv' | 'excel',
    dataType: 'bets' | 'transactions' | 'analytics',
  ) => {
    try {
      const blob = await exportFinancialData({
        format,
        dataType,
        filters: {
          search: filters.search || undefined,
          userId: filters.userId,
          predictionId: filters.predictionId,
          betType:
            filters.betType.length > 0 ? (filters.betType as ('single' | 'parlay')[]) : undefined,
          status:
            filters.status.length > 0
              ? (filters.status as ('pending' | 'won' | 'lost' | 'refunded')[])
              : undefined,
          transactionType:
            filters.transactionType.length > 0
              ? (filters.transactionType as ('DEBIT' | 'CREDIT')[])
              : undefined,
          minAmount: filters.minAmount,
          maxAmount: filters.maxAmount,
          startDate: filters.startDate,
          endDate: filters.endDate,
          suspiciousOnly: filters.suspiciousOnly,
          page: 0,
          limit: 10000, // Export all data
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        },
      });

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_${dataType}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Calculate totals for overview
  const overviewStats = useMemo(() => {
    if (!financialData) return null;

    const totalBetAmount = financialData.bets.reduce((sum, bet) => sum + asNum(bet.amount), 0);
    const totalPayout = financialData.bets.reduce((sum, bet) => sum + asNum(bet.payout || 0), 0);
    const refundedAmount = financialData.bets
      .filter((bet) => bet.status === 'REFUNDED')
      .reduce((sum, bet) => sum + asNum(bet.amount), 0);

    return {
      totalBets: financialData.bets.length,
      totalTransactions: financialData.transactions.length,
      totalBetAmount,
      totalPayout,
      refundedAmount,
      netRevenue: totalBetAmount - totalPayout - refundedAmount,
    };
  }, [financialData]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-surface border border-muted rounded-lg">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-content">Financial Operations</h1>
            <p className="text-xs text-tertiary">
              Comprehensive financial data across betting, parlays, and pong
            </p>
          </div>

          {/* Real-time Status */}
          <div className="flex items-center gap-2 px-2 py-1 bg-background rounded-full border border-muted">
            <div
              className={`w-2 h-2 rounded-full ${
                realtimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            ></div>
            <span className="text-xs font-medium text-tertiary">
              {realtimeEnabled ? 'Live' : 'Off'}
              {lastUpdateTime && realtimeEnabled && (
                <span className="ml-1">({lastUpdateTime})</span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Toggle */}
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={realtimeEnabled}
              onChange={(e) => setRealtimeEnabled(e.target.checked)}
              className="w-3 h-3 text-primary border-muted rounded focus:ring-primary focus:ring-1"
            />
            <span className="text-content font-medium">Real-time</span>
          </label>

          <div className="w-px h-4 bg-muted"></div>

          <button
            onClick={() => handleExport('csv', activeTab === 'bets' ? 'bets' : 'transactions')}
            className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-xs font-medium"
          >
            Export CSV
          </button>

          <button
            onClick={loadFinancialData}
            disabled={loading}
            className="px-3 py-1 bg-secondary text-white rounded hover:opacity-90 transition-opacity text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Loading
              </span>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <FinancialTabs activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} />

      {/* Collapsible Filters */}
      <FinancialFilters
        filters={filters}
        onFiltersChange={updateFilters}
        onClearFilters={clearFilters}
        activeTab={activeTab}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <div>
              <h4 className="font-semibold text-sm">Error Loading Financial Data</h4>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Compact Overview Stats */}
          {overviewStats && <FinancialStatsOverview stats={overviewStats} />}

          {/* Compact Analytics Summary */}
          {analytics && (
            <div className="bg-surface rounded-lg border border-muted p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📊</span>
                <h3 className="text-sm font-semibold text-content">Analytics Summary</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-background rounded border border-muted">
                  <div className="text-lg font-bold text-primary">
                    ${formatMuskBucks(analytics.totalVolume)}
                  </div>
                  <div className="text-xs text-tertiary">Total Volume</div>
                </div>
                <div className="text-center p-3 bg-background rounded border border-muted">
                  <div className="text-lg font-bold text-primary">{analytics.totalBets}</div>
                  <div className="text-xs text-tertiary">Total Bets</div>
                </div>
                <div className="text-center p-3 bg-background rounded border border-muted">
                  <div className="text-lg font-bold text-primary">
                    ${formatMuskBucks(analytics.avgBetAmount)}
                  </div>
                  <div className="text-xs text-tertiary">Avg Bet Size</div>
                </div>
                <div className="text-center p-3 bg-background rounded border border-muted">
                  <div
                    className={`text-lg font-bold ${
                      Number(analytics.netRevenue) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ${formatMuskBucks(analytics.netRevenue)}
                  </div>
                  <div className="text-xs text-tertiary">Net Revenue</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'unified' && financialData && (
        <div className="space-y-4">
          {/* Unified Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-primary">
                {financialData.bets.length + financialData.transactions.length}
              </div>
              <div className="text-xs text-tertiary">Total Records</div>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-green-600">
                {financialData.transactions.filter((tx) => tx.subtype?.includes('PAYOUT')).length}
              </div>
              <div className="text-xs text-tertiary">Payouts</div>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-red-600">
                {financialData.transactions.filter((tx) => tx.subtype?.includes('WAGER')).length}
              </div>
              <div className="text-xs text-tertiary">Wagers</div>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-purple-600">
                {financialData.transactions.filter((tx) => tx.subtype?.includes('PONG')).length}
              </div>
              <div className="text-xs text-tertiary">Pong</div>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-blue-600">
                {financialData.transactions.filter((tx) => tx.subtype?.includes('PARLAY')).length}
              </div>
              <div className="text-xs text-tertiary">Parlays</div>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-orange-600">
                {financialData.transactions.filter((tx) => tx.subtype?.includes('BET')).length}
              </div>
              <div className="text-xs text-tertiary">Single Bets</div>
            </div>
          </div>

          {/* Transactions Table */}
          <TransactionsTable transactions={financialData.transactions} />

          {/* Pagination */}
          <CompactPagination
            currentPage={currentPage}
            totalPages={financialData.totalPages || 1}
            pageSize={pageSize}
            totalItems={financialData.totalTransactions || 0}
            hasNextPage={financialData.hasNextPage || false}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {activeTab === 'transactions' && financialData && (
        <div className="space-y-4">
          <TransactionsTable transactions={financialData.transactions} />

          <CompactPagination
            currentPage={currentPage}
            totalPages={financialData.totalPages || 1}
            pageSize={pageSize}
            totalItems={financialData.totalTransactions || 0}
            hasNextPage={financialData.hasNextPage || false}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {activeTab === 'pong' && financialData && (
        <div className="space-y-4">
          {/* Pong Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-purple-600">
                {financialData.transactions.filter((tx) => tx.subtype === 'PONG_WAGER').length}
              </div>
              <div className="text-xs text-tertiary">Pong Wagers</div>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-green-600">
                {financialData.transactions.filter((tx) => tx.subtype === 'PONG_PAYOUT').length}
              </div>
              <div className="text-xs text-tertiary">Pong Payouts</div>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-blue-600">
                $
                {formatMuskBucks(
                  financialData.transactions
                    .filter((tx) => tx.subtype === 'PONG_WAGER')
                    .reduce((sum, tx) => sum + Math.abs(asNum(tx.amount)), 0),
                )}
              </div>
              <div className="text-xs text-tertiary">Total Wagered</div>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-muted text-center">
              <div className="text-lg font-bold text-orange-600">
                $
                {formatMuskBucks(
                  financialData.transactions
                    .filter((tx) => tx.subtype === 'PONG_PAYOUT')
                    .reduce((sum, tx) => sum + asNum(tx.amount), 0),
                )}
              </div>
              <div className="text-xs text-tertiary">Total Paid Out</div>
            </div>
          </div>

          {/* Pong Transactions */}
          <TransactionsTable
            transactions={financialData.transactions.filter((tx) => tx.subtype?.includes('PONG'))}
          />
        </div>
      )}

      {activeTab === 'bets' && financialData && (
        <div className="space-y-4">
          {/* Compact Bulk Actions */}
          {selectedBets.size > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm text-content">
                  {selectedBets.size} bet{selectedBets.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkRefund}
                    disabled={bulkLoading}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 text-xs font-medium"
                  >
                    {bulkLoading ? 'Processing...' : 'Bulk Refund'}
                  </button>
                  <button
                    onClick={() => setSelectedBets(new Set())}
                    className="px-3 py-1 bg-muted text-content rounded hover:bg-muted/80 text-xs font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compact Bets Table */}
          <div className="bg-surface rounded-lg border border-muted overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={
                          financialData.bets.length > 0 &&
                          selectedBets.size === financialData.bets.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBets(new Set(financialData.bets.map((bet) => bet.id)));
                          } else {
                            setSelectedBets(new Set());
                          }
                        }}
                        className="w-3 h-3"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase">
                      User
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase">
                      Prediction
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase">
                      Payout
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-content uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/50">
                  {financialData.bets.map((bet: AdminBetView) => (
                    <tr key={bet.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedBets.has(bet.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedBets);
                            if (e.target.checked) {
                              newSelected.add(bet.id);
                            } else {
                              newSelected.delete(bet.id);
                            }
                            setSelectedBets(newSelected);
                          }}
                          className="w-3 h-3"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          {bet.userAvatarUrl ? (
                            <img
                              src={bet.userAvatarUrl}
                              alt={bet.userName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {bet.userName?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-content truncate max-w-24">
                              {bet.userName}
                            </div>
                            {bet.userEmail && (
                              <div className="text-tertiary truncate max-w-24">{bet.userEmail}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div
                          className="font-medium text-content truncate max-w-32"
                          title={bet.predictionTitle}
                        >
                          {bet.predictionTitle || 'Unknown'}
                        </div>
                        <div className="text-tertiary">{bet.optionLabel}</div>
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-content">
                        ${formatMuskBucks(asNum(bet.amount))}
                      </td>
                      <td className="px-3 py-2 text-xs text-content">
                        ${formatMuskBucks(asNum(bet.potentialPayout || 0))}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            bet.status === 'WON'
                              ? 'bg-green-100 text-green-800'
                              : bet.status === 'LOST'
                                ? 'bg-red-100 text-red-800'
                                : bet.status === 'REFUNDED'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {bet.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-tertiary">
                        {new Date(bet.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <CompactPagination
            currentPage={currentPage}
            totalPages={financialData.totalPages || 1}
            pageSize={pageSize}
            totalItems={financialData.totalBets || 0}
            hasNextPage={financialData.hasNextPage || false}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Compact Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8 bg-surface rounded-lg border border-muted">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
            <span className="text-sm font-medium text-content">Loading Financial Data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
