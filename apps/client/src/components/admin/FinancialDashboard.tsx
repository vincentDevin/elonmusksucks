import { useState, useEffect, useMemo } from 'react';
import {
  searchFinancialData,
  getFinancialAnalytics,
  bulkFinancialOperation,
  exportFinancialData,
  type FinancialSearchParams,
  type PaginatedFinancialData,
  type DetailedBet,
  type DetailedTransaction,
} from '../../api/admin';
import type { AdminFinancialAnalyticsResponse } from '@ems/types';

interface FilterState {
  search: string;
  userId?: number;
  predictionId?: number;
  betType: string[];
  status: string[];
  transactionType: string[];
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  suspiciousOnly: boolean;
  sortBy: 'createdAt' | 'amount' | 'potentialPayout' | 'userName' | 'profit';
  sortOrder: 'asc' | 'desc';
}

const initialFilters: FilterState = {
  search: '',
  betType: [],
  status: [],
  transactionType: [],
  suspiciousOnly: false,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'bets' | 'transactions'>('overview');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Data states
  const [financialData, setFinancialData] = useState<PaginatedFinancialData | null>(null);
  const [analytics, setAnalytics] = useState<AdminFinancialAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection and bulk operations
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

      alert(`Refunded ${result.successCount} bets. Total refunded: $${result.totalRefunded || 0}`);
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

    const totalBetAmount = financialData.bets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalPayout = financialData.bets.reduce((sum, bet) => sum + (bet.payout || 0), 0);
    const refundedAmount = financialData.bets
      .filter((bet) => bet.status === 'REFUNDED')
      .reduce((sum, bet) => sum + bet.amount, 0);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-content">Financial Operations Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv', activeTab === 'bets' ? 'bets' : 'transactions')}
            className="px-3 py-1 bg-primary text-surface rounded hover:opacity-90 text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={loadFinancialData}
            disabled={loading}
            className="px-3 py-1 bg-secondary text-surface rounded hover:opacity-90 text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-muted">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'bets', label: 'Bets' },
          { key: 'transactions', label: 'Transactions' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-tertiary hover:text-content'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-surface p-4 rounded-lg border border-muted">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-content mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="User name, email, prediction title..."
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-sm font-medium text-content mb-1">Min Amount</label>
            <input
              type="number"
              value={filters.minAmount || ''}
              onChange={(e) =>
                updateFilters({ minAmount: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="0"
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-content mb-1">Max Amount</label>
            <input
              type="number"
              value={filters.maxAmount || ''}
              onChange={(e) =>
                updateFilters({ maxAmount: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="∞"
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-content mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-content mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>

          {/* Status Filter */}
          {activeTab === 'bets' && (
            <div>
              <label className="block text-sm font-medium text-content mb-1">Status</label>
              <select
                multiple
                value={filters.status}
                onChange={(e) =>
                  updateFilters({
                    status: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              >
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          )}

          {/* Transaction Type Filter */}
          {activeTab === 'transactions' && (
            <div>
              <label className="block text-sm font-medium text-content mb-1">
                Transaction Type
              </label>
              <select
                multiple
                value={filters.transactionType}
                onChange={(e) =>
                  updateFilters({
                    transactionType: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              >
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
          )}

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-muted text-content rounded hover:opacity-80 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview Stats */}
          {overviewStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-surface p-4 rounded-lg border border-muted">
                <div className="text-2xl font-bold text-primary">{overviewStats.totalBets}</div>
                <div className="text-sm text-tertiary">Total Bets</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-muted">
                <div className="text-2xl font-bold text-primary">
                  {overviewStats.totalTransactions}
                </div>
                <div className="text-sm text-tertiary">Transactions</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-muted">
                <div className="text-2xl font-bold text-primary">
                  ${overviewStats.totalBetAmount}
                </div>
                <div className="text-sm text-tertiary">Bet Volume</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-muted">
                <div className="text-2xl font-bold text-primary">${overviewStats.totalPayout}</div>
                <div className="text-sm text-tertiary">Payouts</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-muted">
                <div className="text-2xl font-bold text-primary">
                  ${overviewStats.refundedAmount}
                </div>
                <div className="text-sm text-tertiary">Refunded</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-muted">
                <div className="text-2xl font-bold text-primary">${overviewStats.netRevenue}</div>
                <div className="text-sm text-tertiary">Net Revenue</div>
              </div>
            </div>
          )}

          {/* Analytics Summary */}
          {analytics && (
            <div className="bg-surface p-6 rounded-lg border border-muted">
              <h3 className="text-lg font-semibold text-content mb-4">Analytics Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-xl font-bold text-primary">${analytics.totalVolume}</div>
                  <div className="text-sm text-tertiary">Total Volume</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-primary">{analytics.totalBets}</div>
                  <div className="text-sm text-tertiary">Total Bets</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-primary">${analytics.avgBetAmount}</div>
                  <div className="text-sm text-tertiary">Avg Bet Size</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-primary">${analytics.netRevenue}</div>
                  <div className="text-sm text-tertiary">Net Revenue</div>
                </div>
              </div>
            </div>
          )}

          {/* Top Users */}
          {analytics && analytics.topUsers.length > 0 && (
            <div className="bg-surface p-6 rounded-lg border border-muted">
              <h3 className="text-lg font-semibold text-content mb-4">Top Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-muted">
                      <th className="text-left py-2 text-sm font-medium text-content">User</th>
                      <th className="text-left py-2 text-sm font-medium text-content">
                        Total Wagered
                      </th>
                      <th className="text-left py-2 text-sm font-medium text-content">Total Won</th>
                      <th className="text-left py-2 text-sm font-medium text-content">Net Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topUsers.map((user, index) => (
                      <tr key={index} className="border-b border-muted">
                        <td className="py-2 text-sm text-content">{user.userName}</td>
                        <td className="py-2 text-sm text-content">${user.totalWagered}</td>
                        <td className="py-2 text-sm text-content">${user.totalWon}</td>
                        <td className="py-2 text-sm text-content">${user.netLoss}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bets Tab */}
      {activeTab === 'bets' && financialData && (
        <div className="space-y-4">
          {/* Bulk Actions */}
          {selectedBets.size > 0 && (
            <div className="bg-surface p-4 rounded-lg border border-muted flex items-center justify-between">
              <span className="text-content">{selectedBets.size} bets selected</span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkRefund}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-yellow-500 text-surface rounded hover:opacity-90 disabled:opacity-50"
                >
                  {bulkLoading ? 'Processing...' : 'Bulk Refund'}
                </button>
                <button
                  onClick={() => setSelectedBets(new Set())}
                  className="px-4 py-2 bg-muted text-content rounded hover:opacity-80"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Bets Table */}
          <div className="bg-surface rounded-lg border border-muted overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">
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
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">
                      Prediction
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">
                      Potential Payout
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">
                      Created At
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {financialData.bets.map((bet: DetailedBet) => (
                    <tr key={bet.id} className="hover:bg-background">
                      <td className="px-4 py-3">
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
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-content">{bet.userName}</div>
                        <div className="text-tertiary">{bet.userEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div
                          className="font-medium text-content max-w-xs truncate"
                          title={bet.prediction?.title}
                        >
                          {bet.prediction?.title || 'Unknown'}
                        </div>
                        <div className="text-tertiary">{bet.prediction?.category}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-content">${bet.amount}</td>
                      <td className="px-4 py-3 text-sm text-content">
                        ${bet.potentialPayout || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                      <td className="px-4 py-3 text-sm text-tertiary">
                        {new Date(bet.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {bet.status === 'PENDING' && (
                          <button
                            onClick={() => handleBulkRefund()}
                            className="text-sm text-yellow-600 hover:text-yellow-800"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-surface px-4 py-3 rounded-lg border border-muted">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-tertiary">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 border border-muted rounded text-sm bg-background text-content"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-tertiary">per page</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-muted text-content rounded hover:opacity-80 disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-content">
                Page {currentPage + 1} of {financialData.totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(financialData.totalPages - 1, prev + 1))
                }
                disabled={!financialData.hasNextPage}
                className="px-3 py-1 bg-muted text-content rounded hover:opacity-80 disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && financialData && (
        <div className="space-y-4">
          {/* Transactions Table */}
          <div className="bg-surface rounded-lg border border-muted overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">
                      Balance After
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">
                      Related Bet
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-content">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {financialData.transactions.map((tx: DetailedTransaction) => (
                    <tr key={tx.id} className="hover:bg-background">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-content">{tx.userName}</div>
                        <div className="text-tertiary">{tx.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tx.type === 'CREDIT'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-content">
                        {tx.type === 'CREDIT' ? '+' : '-'}${Math.abs(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-content">${tx.balanceAfter}</td>
                      <td className="px-4 py-3 text-sm text-tertiary">
                        {tx.relatedBetId
                          ? `Bet #${tx.relatedBetId}`
                          : tx.relatedParlayId
                            ? `Parlay #${tx.relatedParlayId}`
                            : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-tertiary">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-surface px-4 py-3 rounded-lg border border-muted">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-tertiary">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 border border-muted rounded text-sm bg-background text-content"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-tertiary">per page</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-muted text-content rounded hover:opacity-80 disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-content">
                Page {currentPage + 1} of {financialData.totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(financialData.totalPages - 1, prev + 1))
                }
                disabled={!financialData.hasNextPage}
                className="px-3 py-1 bg-muted text-content rounded hover:opacity-80 disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
