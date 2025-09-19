// apps/client/src/components/admin/EventSystemMonitor.tsx
// Performance monitoring dashboard for the event system
// Real-time metrics display with health indicators and detailed breakdowns

import { useState, useEffect } from 'react';
import { useEventSystemMetrics } from '../../hooks/useEventSystemMetrics';

export default function EventSystemMonitor() {
  const { metrics, getTopEvents, getSlowestEvents, getEventFrequency, resetMetrics, isHealthy } =
    useEventSystemMetrics();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // Auto-refresh display every 2 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Force re-render to show updated metrics
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getHealthColor = () => {
    if (metrics.performance.errorRate > 10) return 'text-red-500';
    if (metrics.performance.errorRate > 5) return 'text-yellow-500';
    return 'text-green-500';
  };

  const topEvents = getTopEvents(10);
  const slowestEvents = getSlowestEvents(5);

  return (
    <div className="bg-surface rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-content">Event System Monitor</h2>
          <p className="text-tertiary text-sm">
            Real-time performance metrics for the event bus system
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${getHealthColor()}`}>
            <div
              className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
            />
            <span className="font-medium">{isHealthy ? 'Healthy' : 'Degraded'}</span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              autoRefresh ? 'bg-primary text-white' : 'bg-muted text-tertiary hover:bg-tertiary'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={resetMetrics}
            className="px-3 py-1 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition"
          >
            Reset Metrics
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-content">{metrics.totalListeners}</div>
          <div className="text-sm text-tertiary">Total Listeners</div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-content">{metrics.activeEvents.length}</div>
          <div className="text-sm text-tertiary">Active Event Types</div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-border">
          <div className={`text-2xl font-bold ${getHealthColor()}`}>
            {metrics.performance.errorRate.toFixed(1)}%
          </div>
          <div className="text-sm text-tertiary">Error Rate</div>
        </div>

        <div className="bg-background rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-content">{formatUptime(metrics.uptime)}</div>
          <div className="text-sm text-tertiary">Uptime</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-background rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-content mb-3">Processing Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-tertiary">Average Processing:</span>
              <span className="font-medium text-content">
                {formatTime(metrics.performance.avgEventProcessingTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Slowest Event:</span>
              <span className="font-medium text-content">
                {metrics.performance.slowestEvent || 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Fastest Event:</span>
              <span className="font-medium text-content">
                {metrics.performance.fastestEvent || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        {metrics.memoryUsage && (
          <div className="bg-background rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-content mb-3">Memory Usage</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-tertiary">Used:</span>
                <span className="font-medium text-content">
                  {formatNumber(metrics.memoryUsage.used)} bytes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-tertiary">Total:</span>
                <span className="font-medium text-content">
                  {formatNumber(metrics.memoryUsage.total)} bytes
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(metrics.memoryUsage.percentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-tertiary text-center">
                {metrics.memoryUsage.percentage.toFixed(1)}% used
              </div>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="bg-background rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-content mb-3">System Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-tertiary">Health:</span>
              <span className={`font-medium ${getHealthColor()}`}>
                {isHealthy ? 'Good' : 'Needs Attention'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Last Updated:</span>
              <span className="font-medium text-content">
                {new Date(metrics.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Monitoring:</span>
              <span className="font-medium text-green-500">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Events by Count */}
        <div className="bg-background rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-content mb-3">Most Frequent Events</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {topEvents.map((event, index) => (
              <div
                key={event.eventType}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                  selectedEvent === event.eventType ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
                onClick={() =>
                  setSelectedEvent(selectedEvent === event.eventType ? null : event.eventType)
                }
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-tertiary">#{index + 1}</div>
                  <div>
                    <div className="font-medium text-content text-sm">{event.eventType}</div>
                    <div className="text-xs text-tertiary">
                      {getEventFrequency(event.eventType).toFixed(2)} events/sec
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-content">{formatNumber(event.count)}</div>
                  <div className="text-xs text-tertiary">
                    {event.errors > 0 && (
                      <span className="text-red-500">{event.errors} errors</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slowest Events */}
        <div className="bg-background rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-content mb-3">Slowest Events</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {slowestEvents.map((event, index) => (
              <div
                key={event.eventType}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                  selectedEvent === event.eventType ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
                onClick={() =>
                  setSelectedEvent(selectedEvent === event.eventType ? null : event.eventType)
                }
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-tertiary">#{index + 1}</div>
                  <div>
                    <div className="font-medium text-content text-sm">{event.eventType}</div>
                    <div className="text-xs text-tertiary">
                      {formatNumber(event.count)} total events
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-content">
                    {formatTime(event.processingTime.avg)}
                  </div>
                  <div className="text-xs text-tertiary">
                    {formatTime(event.processingTime.min)} - {formatTime(event.processingTime.max)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Event Details */}
      {selectedEvent && metrics.eventMetrics[selectedEvent] && (
        <div className="bg-background rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-content mb-3">Event Details: {selectedEvent}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const event = metrics.eventMetrics[selectedEvent];
              return (
                <>
                  <div>
                    <div className="text-sm text-tertiary mb-1">Event Count</div>
                    <div className="text-xl font-bold text-content">
                      {formatNumber(event.count)}
                    </div>
                    <div className="text-xs text-tertiary">
                      {event.errors > 0 &&
                        `${event.errors} errors (${((event.errors / event.count) * 100).toFixed(1)}%)`}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-tertiary mb-1">Processing Time</div>
                    <div className="text-xl font-bold text-content">
                      {formatTime(event.processingTime.avg)}
                    </div>
                    <div className="text-xs text-tertiary">
                      Range: {formatTime(event.processingTime.min)} -{' '}
                      {formatTime(event.processingTime.max)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-tertiary mb-1">Frequency</div>
                    <div className="text-xl font-bold text-content">
                      {getEventFrequency(selectedEvent).toFixed(2)} /sec
                    </div>
                    <div className="text-xs text-tertiary">
                      Avg interval: {formatTime(event.averageInterval)}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
