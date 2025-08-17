import React, { useState, useEffect, useCallback } from 'react';
import {
  getExecutiveDashboard,
  getRealtimeMetrics,
  type ExecutiveDashboardData,
  type RealtimeMetrics,
  type AnalyticsParams,
} from '../../api/admin';
import { useSocket } from '../../contexts/SocketContext';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  suffix?: string;
  positive?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  suffix = '',
  positive: _positive,
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (
        title.toLowerCase().includes('revenue') ||
        title.toLowerCase().includes('profit') ||
        title.toLowerCase().includes('value')
      ) {
        return `$${val.toLocaleString()}`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const changeColor = change !== undefined ? (change >= 0 ? 'text-green-600' : 'text-red-600') : '';
  const changeIcon = change !== undefined ? (change >= 0 ? '↗' : '↘') : '';

  return (
    <div className="bg-surface rounded-lg p-6 border border-muted">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-tertiary text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-content mt-1">
            {formatValue(value)}
            {suffix}
          </p>
        </div>
        {change !== undefined && (
          <div className={`flex items-center ${changeColor}`}>
            <span className="text-lg">{changeIcon}</span>
            <span className="text-sm font-medium ml-1">{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'error';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, status }) => {
  const statusDots = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className="bg-surface rounded-lg p-4 border border-muted">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-tertiary">{title}</h4>
        <div className={`w-3 h-3 rounded-full ${statusDots[status]}`}></div>
      </div>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-content">{value.toFixed(1)}</span>
        <span className="text-sm text-tertiary ml-1">{unit}</span>
      </div>
    </div>
  );
};

const ExecutiveDashboard: React.FC = () => {
  const socket = useSocket();
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('30d');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: AnalyticsParams = {};
      const now = new Date();

      switch (dateRange) {
        case '7d':
          params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          params.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          params.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1y':
          params.startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      params.endDate = now.toISOString();

      const [dashboard, realtime] = await Promise.all([
        getExecutiveDashboard(params),
        getRealtimeMetrics(),
      ]);

      setDashboardData(dashboard);
      setRealtimeMetrics(realtime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time metrics updates via socket
  const handleMetricsUpdate = useCallback((data: { metrics: RealtimeMetrics }) => {
    console.log('[ExecutiveDashboard] Received real-time metrics update');
    setRealtimeMetrics(data.metrics);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for admin metrics updates
    socket.on('admin:metrics:update', handleMetricsUpdate);

    return () => {
      socket.off('admin:metrics:update', handleMetricsUpdate);
    };
  }, [socket, handleMetricsUpdate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-600">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadDashboardData}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData || !realtimeMetrics) {
    return <div className="text-center text-tertiary">No dashboard data available</div>;
  }

  const getSystemHealthStatus = (
    responseTime: number,
    errorRate: number,
  ): 'good' | 'warning' | 'error' => {
    if (responseTime > 200 || errorRate > 0.05) return 'error';
    if (responseTime > 100 || errorRate > 0.02) return 'warning';
    return 'good';
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-content">Executive Dashboard</h2>
          <p className="text-tertiary mt-1">Business intelligence and key performance indicators</p>
        </div>
        <div className="flex space-x-2">
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '1y', label: '1 Year' },
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => setDateRange(range.key)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                dateRange === range.key
                  ? 'bg-primary text-white'
                  : 'bg-surface text-tertiary hover:text-content border border-muted'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="bg-surface rounded-lg p-6 border border-muted">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-content">Real-time System Metrics</h3>
          <div className="flex items-center text-sm text-tertiary">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            Live (real-time events)
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Active Users"
            value={realtimeMetrics.activeUsers}
            unit="users"
            status="good"
          />
          <MetricCard
            title="Active Bets"
            value={realtimeMetrics.activeBets}
            unit="bets"
            status="good"
          />
          <MetricCard
            title="Recent Transactions"
            value={realtimeMetrics.recentTransactions}
            unit="txns"
            status="good"
          />
          <MetricCard
            title="Response Time"
            value={realtimeMetrics.systemHealth.responseTime}
            unit="ms"
            status={getSystemHealthStatus(
              realtimeMetrics.systemHealth.responseTime,
              realtimeMetrics.systemHealth.errorRate,
            )}
          />
          <MetricCard
            title="System Uptime"
            value={realtimeMetrics.systemHealth.uptime}
            unit="%"
            status="good"
          />
        </div>
      </div>

      {/* Overview KPIs */}
      <div>
        <h3 className="text-lg font-semibold text-content mb-4">Business Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Users"
            value={dashboardData.overview.totalUsers}
            change={dashboardData.currentPeriodComparison.newUsers.change}
          />
          <KPICard title="Active Users" value={dashboardData.overview.activeUsers} />
          <KPICard
            title="Total Revenue"
            value={dashboardData.overview.totalRevenue}
            change={dashboardData.currentPeriodComparison.revenue.change}
          />
          <KPICard title="Net Profit" value={dashboardData.overview.netProfit} />
          <KPICard title="Total Predictions" value={dashboardData.overview.totalPredictions} />
          <KPICard
            title="Total Bets"
            value={dashboardData.overview.totalBets}
            change={dashboardData.currentPeriodComparison.bets.change}
          />
          <KPICard title="Avg User Value" value={dashboardData.overview.avgUserValue} />
          <KPICard
            title="User Retention"
            value={dashboardData.growthMetrics.retentionRate}
            suffix="%"
          />
        </div>
      </div>

      {/* Growth Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-content mb-4">Growth Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="User Growth Rate"
            value={dashboardData.growthMetrics.userGrowthRate}
            suffix="%"
            positive={dashboardData.growthMetrics.userGrowthRate >= 0}
          />
          <KPICard
            title="Revenue Growth Rate"
            value={dashboardData.growthMetrics.revenueGrowthRate}
            suffix="%"
            positive={dashboardData.growthMetrics.revenueGrowthRate >= 0}
          />
          <KPICard
            title="Engagement Growth"
            value={dashboardData.growthMetrics.engagementGrowthRate}
            suffix="%"
            positive={dashboardData.growthMetrics.engagementGrowthRate >= 0}
          />
          <KPICard
            title="Retention Rate"
            value={dashboardData.growthMetrics.retentionRate}
            suffix="%"
            positive={dashboardData.growthMetrics.retentionRate >= 50}
          />
        </div>
      </div>

      {/* Period Comparison */}
      <div>
        <h3 className="text-lg font-semibold text-content mb-4">Period Comparison</h3>
        <div className="bg-surface rounded-lg border border-muted overflow-hidden">
          <div className="grid grid-cols-4 bg-muted">
            <div className="p-4 font-medium text-content">Metric</div>
            <div className="p-4 font-medium text-content">Current Period</div>
            <div className="p-4 font-medium text-content">Previous Period</div>
            <div className="p-4 font-medium text-content">Change</div>
          </div>

          {[
            {
              name: 'New Users',
              current: dashboardData.currentPeriodComparison.newUsers.current,
              previous: dashboardData.currentPeriodComparison.newUsers.previous,
              change: dashboardData.currentPeriodComparison.newUsers.change,
            },
            {
              name: 'Revenue',
              current: `$${dashboardData.currentPeriodComparison.revenue.current.toLocaleString()}`,
              previous: `$${dashboardData.currentPeriodComparison.revenue.previous.toLocaleString()}`,
              change: dashboardData.currentPeriodComparison.revenue.change,
            },
            {
              name: 'Total Bets',
              current: dashboardData.currentPeriodComparison.bets.current,
              previous: dashboardData.currentPeriodComparison.bets.previous,
              change: dashboardData.currentPeriodComparison.bets.change,
            },
          ].map((row, index) => (
            <div key={index} className="grid grid-cols-4 border-t border-muted">
              <div className="p-4 text-content font-medium">{row.name}</div>
              <div className="p-4 text-content">{row.current}</div>
              <div className="p-4 text-content">{row.previous}</div>
              <div
                className={`p-4 font-medium ${row.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {row.change >= 0 ? '+' : ''}
                {row.change.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Refreshing...' : 'Refresh Dashboard'}
        </button>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
