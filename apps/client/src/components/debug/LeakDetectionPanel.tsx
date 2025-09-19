// apps/client/src/components/debug/LeakDetectionPanel.tsx
// Visual leak detection panel for development
// Shows real-time listener counts, alerts, and memory usage

import React, { useState, useEffect } from 'react';
import { useNavigationLeakMonitor } from '../../lib/leakDetectionMonitor';

export function LeakDetectionPanel() {
  const { alerts, getStats, printReport, reset, enabled, setEnabled } = useNavigationLeakMonitor();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => setStats(getStats());
    updateStats();

    const interval = setInterval(updateStats, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [getStats]);

  if (!enabled) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs">
        <button onClick={() => setEnabled(true)} className="hover:text-blue-300">
          🔍 Enable Leak Monitor
        </button>
      </div>
    );
  }

  const hasAlerts = alerts.length > 0;
  const hasWarnings = alerts.some((a) => a.type === 'warning');
  const hasCritical = alerts.some((a) => a.type === 'critical');

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white rounded-lg shadow-lg max-w-sm z-50">
      {/* Header */}
      <div
        className={`p-3 cursor-pointer select-none ${
          hasCritical ? 'bg-red-700' : hasWarnings ? 'bg-yellow-600' : 'bg-gray-800'
        } rounded-t-lg`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">
            🔍 Leak Monitor {hasAlerts && `(${alerts.length})`}
          </span>
          <span className="text-xs">{isExpanded ? '▼' : '▲'}</span>
        </div>

        {stats && !('noData' in stats) && (
          <div className="text-xs mt-1 opacity-90">
            Listeners: {stats.baseline} → {stats.current}
            {stats.growth !== 0 && (
              <span className={stats.growth > 0 ? 'text-red-300' : 'text-green-300'}>
                {' '}
                ({stats.growth >= 0 ? '+' : ''}
                {stats.growth})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 bg-gray-800 rounded-b-lg">
          {/* Stats */}
          {stats && !('noData' in stats) && (
            <div className="mb-3">
              <div className="text-xs mb-2">
                <div>Growth: {stats.growthPercentage}%</div>
                <div>Snapshots: {stats.snapshotCount}</div>
                {stats.memoryGrowth && (
                  <div>
                    Memory: {stats.memoryGrowth.baseline}MB → {stats.memoryGrowth.current}MB (
                    {stats.memoryGrowth.growth >= 0 ? '+' : ''}
                    {stats.memoryGrowth.growth}MB)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold mb-1">Recent Alerts:</div>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {alerts.slice(-3).map((alert, index) => (
                  <div
                    key={index}
                    className={`text-xs p-1 rounded ${
                      alert.type === 'critical'
                        ? 'bg-red-900 text-red-200'
                        : 'bg-yellow-900 text-yellow-200'
                    }`}
                  >
                    <span className="font-semibold">{alert.type === 'critical' ? '🚨' : '⚠️'}</span>{' '}
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 text-xs">
            <button
              onClick={printReport}
              className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-500"
            >
              📊 Report
            </button>
            <button onClick={reset} className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-500">
              🧹 Reset
            </button>
            <button
              onClick={() => setEnabled(false)}
              className="px-2 py-1 bg-red-600 rounded hover:bg-red-500"
            >
              ❌ Disable
            </button>
          </div>

          {/* No Data State */}
          {stats && 'noData' in stats && (
            <div className="text-xs text-gray-400 text-center py-2">
              No monitoring data yet.
              <br />
              Navigate to start monitoring.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Lightweight indicator for minimal UI impact
export function LeakDetectionIndicator() {
  const { alerts } = useNavigationLeakMonitor();

  if (alerts.length === 0) return null;

  const hasCritical = alerts.some((a) => a.type === 'critical');

  return (
    <div
      className={`fixed top-4 right-4 w-3 h-3 rounded-full animate-pulse ${
        hasCritical ? 'bg-red-500' : 'bg-yellow-500'
      }`}
      title={`${alerts.length} leak detection alert(s)`}
    />
  );
}
