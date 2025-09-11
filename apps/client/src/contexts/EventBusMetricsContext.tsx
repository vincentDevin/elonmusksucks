// apps/client/src/contexts/EventBusMetricsContext.tsx
// -----------------------------------------------------------------------------
// EventBus Metrics - Isolated metrics tracking to prevent re-render storms
// Split from main EventBus to isolate metrics consumption to debug components only
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  startTransition,
  type ReactNode,
} from 'react';
import { useEventBusCore } from './EventBusCoreContext';
import type { EventMetrics } from '../types/events';

/* ---------- Types ---------- */

interface EventBusMetricsContextType {
  eventMetrics: EventMetrics;
  clearMetrics: () => void;

  // Additional metrics functionality
  startMetricsCollection: () => void;
  stopMetricsCollection: () => void;
  isCollecting: boolean;

  // Performance insights
  getTopEvents: () => { event: string; count: number }[];
  getAverageLatency: () => number;

  // Core EventBus data access
  getActiveEvents: () => string[];
  getHandlerCount: (event?: string) => number;
}

const EventBusMetricsContext = createContext<EventBusMetricsContextType | undefined>(undefined);

/* ---------- Provider ---------- */
export function EventBusMetricsProvider({ children }: { children: ReactNode }) {
  const {
    subscribe,
    getActiveEvents: coreGetActiveEvents,
    getHandlerCount: coreGetHandlerCount,
  } = useEventBusCore();

  const [eventMetrics, setEventMetrics] = useState<EventMetrics>({
    eventsReceived: 0,
    eventsProcessed: 0,
    errors: 0,
    averageProcessingTime: 0,
    lastEventTime: null,
  });

  const [isCollecting, setIsCollecting] = useState(true);
  const [eventCounts, setEventCounts] = useState<Map<string, number>>(new Map());
  const [processingTimes, setProcessingTimes] = useState<number[]>([]);

  // Start metrics collection
  const startMetricsCollection = useCallback(() => {
    setIsCollecting(true);
  }, []);

  // Stop metrics collection
  const stopMetricsCollection = useCallback(() => {
    setIsCollecting(false);
  }, []);

  // Clear all metrics
  const clearMetrics = useCallback(() => {
    setEventMetrics({
      eventsReceived: 0,
      eventsProcessed: 0,
      errors: 0,
      averageProcessingTime: 0,
      lastEventTime: null,
    });
    setEventCounts(new Map());
    setProcessingTimes([]);
  }, []);

  // Get top events by frequency
  const getTopEvents = useCallback(() => {
    return Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [eventCounts]);

  // Get average latency
  const getAverageLatency = useCallback(() => {
    if (processingTimes.length === 0) return 0;
    return processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
  }, [processingTimes]);

  // Subscribe to all active events for metrics collection
  useEffect(() => {
    if (!isCollecting) return;

    const activeEvents = coreGetActiveEvents();
    const unsubscribers: (() => void)[] = [];

    activeEvents.forEach((event) => {
      const unsubscribe = subscribe(
        event,
        (payload: any) => {
          const startTime = performance.now();

          // Update received count
          setEventMetrics((prev) => ({
            ...prev,
            eventsReceived: prev.eventsReceived + 1,
            lastEventTime: Date.now(),
          }));

          // Update event counts
          setEventCounts((prev) => {
            const newMap = new Map(prev);
            newMap.set(event, (newMap.get(event) || 0) + 1);
            return newMap;
          });

          // React 19 Optimization: Use startTransition for non-blocking metrics processing
          startTransition(() => {
            const processingTime = performance.now() - startTime;

            setProcessingTimes((prev) => [...prev.slice(-99), processingTime]); // Keep last 100

            setEventMetrics((prevMetrics) => {
              const newCount = prevMetrics.eventsProcessed + 1;
              return {
                eventsReceived: prevMetrics.eventsReceived,
                eventsProcessed: newCount,
                errors: prevMetrics.errors,
                averageProcessingTime:
                  prevMetrics.averageProcessingTime === 0
                    ? processingTime
                    : (prevMetrics.averageProcessingTime * (newCount - 1) + processingTime) /
                      newCount,
                lastEventTime: prevMetrics.lastEventTime,
              };
            });
          });
        },
        { priority: 'low' }, // Metrics collection is low priority
      );

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [subscribe, coreGetActiveEvents, isCollecting]);

  // Periodic metrics cleanup
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Keep processing times array manageable
      setProcessingTimes((prev) => prev.slice(-100));

      // Clean up old event counts (optional)
      setEventCounts((prev) => {
        if (prev.size > 50) {
          // Keep only top 50 most frequent events
          const sorted = Array.from(prev.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50);
          return new Map(sorted);
        }
        return prev;
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(cleanup);
  }, []);

  // Forward EventBusCore methods for convenience in debug components
  const getActiveEventsForMetrics = useCallback(() => {
    return coreGetActiveEvents();
  }, [coreGetActiveEvents]);

  const getHandlerCountForMetrics = useCallback(
    (event?: string) => {
      return coreGetHandlerCount(event);
    },
    [coreGetHandlerCount],
  );

  // Context value
  const value = useMemo<EventBusMetricsContextType>(
    () => ({
      eventMetrics,
      clearMetrics,
      startMetricsCollection,
      stopMetricsCollection,
      isCollecting,
      getTopEvents,
      getAverageLatency,
      getActiveEvents: getActiveEventsForMetrics,
      getHandlerCount: getHandlerCountForMetrics,
    }),
    [
      eventMetrics,
      clearMetrics,
      startMetricsCollection,
      stopMetricsCollection,
      isCollecting,
      getTopEvents,
      getAverageLatency,
      getActiveEventsForMetrics,
      getHandlerCountForMetrics,
    ],
  );

  return (
    <EventBusMetricsContext.Provider value={value}>{children}</EventBusMetricsContext.Provider>
  );
}

/* ---------- Hook ---------- */
export function useEventBusMetrics() {
  const context = useContext(EventBusMetricsContext);
  if (context === undefined) {
    throw new Error('useEventBusMetrics must be used within an EventBusMetricsProvider');
  }
  return context;
}

// Optional hook for components that may or may not have metrics available
export function useEventBusMetricsOptional() {
  return useContext(EventBusMetricsContext);
}
