// apps/client/src/components/debug/EventMetricsDashboard.tsx
// -----------------------------------------------------------------------------
// Event metrics and monitoring dashboard for the EventBus system
// Provides real-time visibility into event processing performance
// -----------------------------------------------------------------------------

import { useState, useEffect, useMemo } from 'react';
import { useEventBusMetrics } from '../../contexts/EventBusMetricsContext';

interface EventMetricsDashboardProps {
  showDetailed?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function EventMetricsDashboard({
  showDetailed = false,
  autoRefresh = true,
  refreshInterval = 1000,
}: EventMetricsDashboardProps) {
  const {
    eventMetrics,
    clearMetrics,
    getTopEvents,
    getAverageLatency,
    getActiveEvents,
    getHandlerCount,
  } = useEventBusMetrics();
  const [isVisible, setIsVisible] = useState(false);

  // Derived values for compatibility
  const activeEvents = getActiveEvents();
  const totalHandlers = getHandlerCount();

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Trigger re-render to update metrics
      setIsVisible((prev) => !prev);
      setTimeout(() => setIsVisible((prev) => !prev), 10);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    const errorRate =
      eventMetrics.eventsReceived > 0
        ? ((eventMetrics.errors / eventMetrics.eventsReceived) * 100).toFixed(2)
        : '0.00';

    const processedRate =
      eventMetrics.eventsReceived > 0
        ? ((eventMetrics.eventsProcessed / eventMetrics.eventsReceived) * 100).toFixed(2)
        : '0.00';

    const avgProcessingTimeFormatted =
      eventMetrics.averageProcessingTime > 0
        ? eventMetrics.averageProcessingTime < 1
          ? `${(eventMetrics.averageProcessingTime * 1000).toFixed(2)}μs`
          : `${eventMetrics.averageProcessingTime.toFixed(2)}ms`
        : '0ms';

    const lastEventFormatted = eventMetrics.lastEventTime
      ? new Date(eventMetrics.lastEventTime).toLocaleTimeString()
      : 'Never';

    return {
      errorRate,
      processedRate,
      avgProcessingTimeFormatted,
      lastEventFormatted,
    };
  }, [eventMetrics]);

  // Performance status
  const performanceStatus = useMemo(() => {
    if (eventMetrics.averageProcessingTime > 10) return { status: 'poor', color: 'text-red-500' };
    if (eventMetrics.averageProcessingTime > 5)
      return { status: 'warning', color: 'text-yellow-500' };
    return { status: 'good', color: 'text-green-500' };
  }, [eventMetrics.averageProcessingTime]);

  if (!showDetailed && totalHandlers === 0) {
    return null; // Don't show if no events are being handled
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-surface border border-border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-content text-sm">EventBus Metrics</h3>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              eventMetrics.lastEventTime && Date.now() - eventMetrics.lastEventTime < 5000
                ? 'bg-green-500 animate-pulse'
                : 'bg-gray-400'
            }`}
          />
          <button
            onClick={clearMetrics}
            className="text-xs text-tertiary hover:text-content transition-colors"
            title="Clear metrics"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-background/50 rounded p-2">
          <div className="text-tertiary">Events Received</div>
          <div className="font-bold text-content">
            {eventMetrics.eventsReceived.toLocaleString()}
          </div>
        </div>

        <div className="bg-background/50 rounded p-2">
          <div className="text-tertiary">Events Processed</div>
          <div className="font-bold text-content">
            {eventMetrics.eventsProcessed.toLocaleString()}
          </div>
        </div>

        <div className="bg-background/50 rounded p-2">
          <div className="text-tertiary">Active Events</div>
          <div className="font-bold text-content">{activeEvents.length}</div>
        </div>

        <div className="bg-background/50 rounded p-2">
          <div className="text-tertiary">Total Handlers</div>
          <div className="font-bold text-content">{totalHandlers}</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-tertiary">Avg Processing:</span>
            <span className={`font-medium ${performanceStatus.color}`}>
              {derivedMetrics.avgProcessingTimeFormatted}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-tertiary">Success Rate:</span>
            <span className="font-medium text-content">{derivedMetrics.processedRate}%</span>
          </div>

          {eventMetrics.errors > 0 && (
            <div className="flex justify-between">
              <span className="text-tertiary">Error Rate:</span>
              <span className="font-medium text-red-500">{derivedMetrics.errorRate}%</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-tertiary">Last Event:</span>
            <span className="font-medium text-content text-right">
              {derivedMetrics.lastEventFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed View */}
      {showDetailed && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-tertiary mb-2">Active Event Channels:</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {activeEvents.length > 0 ? (
              activeEvents.map((event) => (
                <div key={event} className="flex justify-between items-center py-1">
                  <span className="text-content text-xs truncate">{event}</span>
                  <span className="text-tertiary text-xs ml-2">{getHandlerCount(event)}</span>
                </div>
              ))
            ) : (
              <div className="text-tertiary text-xs italic">No active events</div>
            )}
          </div>
        </div>
      )}

      {/* Performance Status Indicator */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-tertiary">Performance:</span>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                performanceStatus.status === 'good'
                  ? 'bg-green-500'
                  : performanceStatus.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
            <span className={`font-medium ${performanceStatus.color} capitalize`}>
              {performanceStatus.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for production
export function CompactEventMetrics() {
  const { metrics } = useEventMetrics();

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-surface border border-border rounded-lg shadow-lg p-2 text-xs">
      <div className="flex items-center space-x-3">
        <div
          className={`w-2 h-2 rounded-full ${
            eventMetrics.lastEventTime && Date.now() - eventMetrics.lastEventTime < 5000
              ? 'bg-green-500 animate-pulse'
              : 'bg-gray-400'
          }`}
        />
        <span className="text-tertiary">
          {eventMetrics.eventsReceived}R / {eventMetrics.eventsProcessed}P
        </span>
        {eventMetrics.errors > 0 && <span className="text-red-500">{eventMetrics.errors}E</span>}
        <span className="text-tertiary">{eventMetrics.averageProcessingTime.toFixed(1)}ms</span>
      </div>
    </div>
  );
}

// Debug panel for development
export function EventDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return <CompactEventMetrics />;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-surface border border-border rounded-lg shadow-lg p-2 text-xs text-tertiary hover:text-content transition-colors"
      >
        📊 Events {isExpanded ? '▼' : '▲'}
      </button>

      {isExpanded && (
        <div className="mt-2">
          <EventMetricsDashboard showDetailed={true} />
        </div>
      )}
    </div>
  );
}
