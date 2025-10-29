import React from 'react';

interface PredictionStatsOverviewProps {
  analytics: {
    totalPending: number;
    totalApproved: number;
    totalResolved: number;
    totalRejected: number;
    avgResolutionTime: number;
  };
  loading?: boolean;
  lastUpdateTime?: string;
  realtimeEnabled?: boolean;
  onRealtimeToggle?: (enabled: boolean) => void;
  className?: string;
}

const PredictionStatsOverview: React.FC<PredictionStatsOverviewProps> = ({
  analytics,
  loading = false,
  lastUpdateTime = '',
  realtimeEnabled = true,
  onRealtimeToggle,
  className = '',
}) => {
  const stats = [
    {
      key: 'pending',
      label: 'Pending',
      value: analytics.totalPending,
      icon: '⏳',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
    },
    {
      key: 'approved',
      label: 'Approved',
      value: analytics.totalApproved,
      icon: '✅',
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
    {
      key: 'resolved',
      label: 'Resolved',
      value: analytics.totalResolved,
      icon: '⚡',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: analytics.totalRejected,
      icon: '❌',
      color: 'text-error',
      bgColor: 'bg-error/10',
      borderColor: 'border-error/20',
    },
  ];

  const totalPredictions = stats.reduce((sum, stat) => sum + stat.value, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-content">Prediction Overview</h2>
          <p className="text-sm text-tertiary">
            {totalPredictions.toLocaleString()} total predictions
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-tertiary">Avg Resolution</div>
          <div className="text-lg font-semibold text-content">{analytics.avgResolutionTime}h</div>
          {loading && <div className="text-xs text-primary mt-1">Updating...</div>}

          {/* Real-time Controls */}
          <div className="mt-2 flex items-center justify-end gap-2">
            {onRealtimeToggle && (
              <button
                onClick={() => onRealtimeToggle(!realtimeEnabled)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  realtimeEnabled
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-muted text-tertiary hover:bg-muted/80'
                }`}
                title={realtimeEnabled ? 'Disable real-time updates' : 'Enable real-time updates'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${realtimeEnabled ? 'bg-success animate-pulse' : 'bg-tertiary'}`}
                ></span>
                <span>{realtimeEnabled ? 'Live' : 'Static'}</span>
              </button>
            )}
            {lastUpdateTime && (
              <div className="text-xs text-tertiary">Last update: {lastUpdateTime}</div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={`relative p-3 rounded-lg border transition-all hover:shadow-sm ${stat.bgColor} ${stat.borderColor} group`}
          >
            <div className="flex items-center gap-3">
              <div className={`text-lg ${stat.color}`}>{stat.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-tertiary uppercase tracking-wide font-medium">
                  {stat.label}
                </div>
                <div
                  className={`text-xl font-bold ${stat.color} group-hover:scale-105 transition-transform`}
                >
                  {stat.value.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Progress indicator */}
            {totalPredictions > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-tertiary mb-1">
                  <span>Share</span>
                  <span>{((stat.value / totalPredictions) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${stat.color.replace('text-', 'bg-')}`}
                    style={{ width: `${(stat.value / totalPredictions) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-surface border border-muted">
          <div className="flex items-center gap-2">
            <span className="text-primary">📊</span>
            <div>
              <div className="font-medium text-content">Approval Rate</div>
              <div className="text-tertiary">
                {totalPredictions > 0
                  ? (
                      ((analytics.totalApproved + analytics.totalResolved) / totalPredictions) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface border border-muted">
          <div className="flex items-center gap-2">
            <span className="text-success">⚡</span>
            <div>
              <div className="font-medium text-content">Resolution Rate</div>
              <div className="text-tertiary">
                {analytics.totalApproved > 0
                  ? ((analytics.totalResolved / analytics.totalApproved) * 100).toFixed(1)
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface border border-muted">
          <div className="flex items-center gap-2">
            <span className="text-warning">⏱️</span>
            <div>
              <div className="font-medium text-content">Pending Queue</div>
              <div className="text-tertiary">
                {analytics.totalPending > 0
                  ? `${analytics.totalPending} awaiting review`
                  : 'All caught up!'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface border border-muted">
          <div className="flex items-center gap-2">
            <span className="text-secondary">🎯</span>
            <div>
              <div className="font-medium text-content">Quality Score</div>
              <div className="text-tertiary">
                {totalPredictions > 0
                  ? (
                      ((analytics.totalApproved + analytics.totalResolved) / totalPredictions) *
                        100 -
                      (analytics.totalRejected / totalPredictions) * 20
                    ).toFixed(1)
                  : 100}
                %
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Performance Metrics */}
        <div className="p-4 rounded-lg bg-surface border border-muted">
          <h3 className="text-sm font-semibold text-content mb-3 flex items-center gap-2">
            <span>📈</span>
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-tertiary">Processing Speed</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(10, 100 - (analytics.avgResolutionTime / 24) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-content">
                  {analytics.avgResolutionTime < 1
                    ? 'Excellent'
                    : analytics.avgResolutionTime < 6
                      ? 'Good'
                      : analytics.avgResolutionTime < 24
                        ? 'Average'
                        : 'Slow'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-tertiary">Throughput</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(10, (analytics.totalResolved / Math.max(1, analytics.totalApproved)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-content">
                  {analytics.totalResolved}/{analytics.totalApproved}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Indicators */}
        <div className="p-4 rounded-lg bg-surface border border-muted">
          <h3 className="text-sm font-semibold text-content mb-3 flex items-center gap-2">
            <span>🏥</span>
            System Health
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-tertiary">Queue Backlog</span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    analytics.totalPending < 10
                      ? 'bg-success/10 text-success'
                      : analytics.totalPending < 50
                        ? 'bg-warning/10 text-warning'
                        : 'bg-error/10 text-error'
                  }`}
                >
                  {analytics.totalPending < 10
                    ? 'Low'
                    : analytics.totalPending < 50
                      ? 'Medium'
                      : 'High'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-tertiary">Rejection Rate</span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    analytics.totalRejected / Math.max(1, totalPredictions) < 0.1
                      ? 'bg-success/10 text-success'
                      : analytics.totalRejected / Math.max(1, totalPredictions) < 0.3
                        ? 'bg-warning/10 text-warning'
                        : 'bg-error/10 text-error'
                  }`}
                >
                  {((analytics.totalRejected / Math.max(1, totalPredictions)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionStatsOverview;
