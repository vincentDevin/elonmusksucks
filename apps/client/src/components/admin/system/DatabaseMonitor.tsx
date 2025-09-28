// Database Performance Monitoring Component
// Displays real-time database query metrics and health status

import { useState, useEffect } from 'react';
import {
  CircleStackIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../../api/axios';

interface QueryMetric {
  model?: string;
  action?: string;
  duration: number;
  timestamp: string;
}

interface DatabaseMetrics {
  database: {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    recentQueries: QueryMetric[];
    status: {
      connected: boolean;
      timestamp: string;
    };
  };
  redis: {
    connected: boolean;
    memory?: string;
    error?: string;
  };
  timestamp: string;
}

export default function DatabaseMonitor() {
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/monitoring/metrics/database');
      setMetrics(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = async () => {
    if (!confirm('Clear all query metrics history?')) return;

    try {
      await api.delete('/api/monitoring/metrics/database');
      await fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear metrics');
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-red-700">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!metrics && loading) {
    return (
      <div className="bg-surface rounded-lg p-6">
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2">Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const getDurationColor = (duration: number) => {
    if (duration < 50) return 'text-green-600';
    if (duration < 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-surface rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CircleStackIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-primary">Database Performance Monitor</h2>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh (5s)</span>
          </label>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-tertiary">PostgreSQL</span>
            {metrics.database.status.connected ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
          </div>
          <p className="text-lg font-bold mt-1">
            {metrics.database.status.connected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-tertiary">Redis</span>
            {metrics.redis.connected ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
          </div>
          <p className="text-lg font-bold mt-1">
            {metrics.redis.connected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-tertiary">Total Queries</span>
            <ChartBarIcon className="w-4 h-4 text-tertiary" />
          </div>
          <p className="text-2xl font-bold mt-1 text-primary">
            {metrics.database.totalQueries.toLocaleString()}
          </p>
          <p className="text-xs text-tertiary mt-1">Last 1000 tracked</p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-tertiary">Avg Duration</span>
            <ChartBarIcon className="w-4 h-4 text-tertiary" />
          </div>
          <p
            className={`text-2xl font-bold mt-1 ${getDurationColor(metrics.database.averageDuration)}`}
          >
            {metrics.database.averageDuration.toFixed(1)}ms
          </p>
          <p className="text-xs text-tertiary mt-1">Target: &lt;100ms</p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-tertiary">Slow Queries</span>
            {metrics.database.slowQueries > 0 && (
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-1 ${metrics.database.slowQueries > 0 ? 'text-yellow-600' : 'text-green-600'}`}
          >
            {metrics.database.slowQueries}
          </p>
          <p className="text-xs text-tertiary mt-1">&gt;100ms queries</p>
        </div>
      </div>

      {/* Recent Queries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-tertiary">Recent Queries</h3>
          <button
            onClick={clearMetrics}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            Clear History
          </button>
        </div>
        <div className="bg-muted rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-tertiary">Model</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-tertiary">Action</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-tertiary">
                    Duration
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-tertiary">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.database.recentQueries.length > 0 ? (
                  metrics.database.recentQueries.map((query, idx) => (
                    <tr key={idx} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-2 text-sm">{query.model || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm">{query.action || 'N/A'}</td>
                      <td
                        className={`px-4 py-2 text-sm text-right font-mono ${getDurationColor(query.duration)}`}
                      >
                        {query.duration}ms
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-tertiary">
                        {new Date(query.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-tertiary">
                      No recent queries recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-tertiary text-right">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
