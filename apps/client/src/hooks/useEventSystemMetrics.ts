// apps/client/src/hooks/useEventSystemMetrics.ts
// Performance monitoring for the event system
// Tracks listener counts, event frequencies, memory usage, and performance metrics

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEventBusCore } from '../contexts/EventBusCoreContext';

interface EventMetrics {
  eventType: string;
  count: number;
  lastReceived: number;
  averageInterval: number;
  errors: number;
  processingTime: {
    min: number;
    max: number;
    avg: number;
    samples: number[];
  };
}

interface SystemMetrics {
  totalListeners: number;
  activeEvents: string[];
  eventMetrics: Record<string, EventMetrics>;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    avgEventProcessingTime: number;
    slowestEvent: string | null;
    fastestEvent: string | null;
    errorRate: number;
  };
  uptime: number;
  lastUpdated: number;
}

export function useEventSystemMetrics() {
  const { subscribe } = useEventBusCore();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalListeners: 0,
    activeEvents: [],
    eventMetrics: {},
    performance: {
      avgEventProcessingTime: 0,
      slowestEvent: null,
      fastestEvent: null,
      errorRate: 0,
    },
    uptime: Date.now(),
    lastUpdated: Date.now(),
  });

  const metricsRef = useRef<SystemMetrics>(metrics);
  const startTime = useRef(Date.now());

  // Update metrics reference when state changes
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // Track event processing
  const trackEvent = useCallback((eventType: string, processingTime: number, hasError = false) => {
    setMetrics((prev) => {
      const now = Date.now();
      const current = prev.eventMetrics[eventType] || {
        eventType,
        count: 0,
        lastReceived: now,
        averageInterval: 0,
        errors: 0,
        processingTime: {
          min: Infinity,
          max: 0,
          avg: 0,
          samples: [],
        },
      };

      // Update processing time metrics
      const newSamples = [...current.processingTime.samples, processingTime].slice(-100); // Keep last 100 samples
      const newMin = Math.min(current.processingTime.min, processingTime);
      const newMax = Math.max(current.processingTime.max, processingTime);
      const newAvg = newSamples.reduce((sum, time) => sum + time, 0) / newSamples.length;

      // Calculate interval between events
      const interval = current.lastReceived ? now - current.lastReceived : 0;
      const newAverageInterval =
        current.count === 0
          ? interval
          : (current.averageInterval * current.count + interval) / (current.count + 1);

      const updatedMetric: EventMetrics = {
        ...current,
        count: current.count + 1,
        lastReceived: now,
        averageInterval: newAverageInterval,
        errors: hasError ? current.errors + 1 : current.errors,
        processingTime: {
          min: newMin,
          max: newMax,
          avg: newAvg,
          samples: newSamples,
        },
      };

      // Update overall performance metrics
      const allEvents = Object.values({ ...prev.eventMetrics, [eventType]: updatedMetric });
      const totalProcessingTimes = allEvents.flatMap((e) => e.processingTime.samples);
      const avgProcessingTime =
        totalProcessingTimes.length > 0
          ? totalProcessingTimes.reduce((sum, time) => sum + time, 0) / totalProcessingTimes.length
          : 0;

      const slowestEvent = allEvents.reduce(
        (slowest, event) =>
          event.processingTime.max > (slowest?.processingTime.max || 0) ? event : slowest,
        null as EventMetrics | null,
      );

      const fastestEvent = allEvents.reduce(
        (fastest, event) =>
          event.processingTime.min < (fastest?.processingTime.min || Infinity) ? event : fastest,
        null as EventMetrics | null,
      );

      const totalEvents = allEvents.reduce((sum, event) => sum + event.count, 0);
      const totalErrors = allEvents.reduce((sum, event) => sum + event.errors, 0);
      const errorRate = totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0;

      return {
        ...prev,
        eventMetrics: {
          ...prev.eventMetrics,
          [eventType]: updatedMetric,
        },
        activeEvents: Object.keys({ ...prev.eventMetrics, [eventType]: updatedMetric }),
        performance: {
          avgEventProcessingTime: avgProcessingTime,
          slowestEvent: slowestEvent?.eventType || null,
          fastestEvent: fastestEvent?.eventType || null,
          errorRate,
        },
        uptime: now - startTime.current,
        lastUpdated: now,
      };
    });
  }, []);

  // Get listener count from EventBusCore
  const updateListenerCount = useCallback(() => {
    const eventBusCore = (window as any).__eventBusCore__;
    if (eventBusCore?.getHandlerCount) {
      const count = eventBusCore.getHandlerCount();
      setMetrics((prev) => ({
        ...prev,
        totalListeners: count,
        lastUpdated: Date.now(),
      }));
    }
  }, []);

  // Get memory usage if available
  const updateMemoryUsage = useCallback(() => {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      setMetrics((prev) => ({
        ...prev,
        memoryUsage: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        },
        lastUpdated: Date.now(),
      }));
    }
  }, []);

  // Setup periodic updates
  useEffect(() => {
    const interval = setInterval(() => {
      updateListenerCount();
      updateMemoryUsage();
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [updateListenerCount, updateMemoryUsage]);

  // Subscribe to all events for monitoring (low-impact listeners)
  useEffect(() => {
    const monitoringSubscriptions: (() => void)[] = [];

    // Common events to monitor
    const eventsToMonitor = [
      'bet:placed',
      'bet:won',
      'bet:lost',
      'prediction:created',
      'prediction:resolved',
      'parlay:placed',
      'chat:message',
      'pong:game:started',
      'pong:game:ended',
      'user:stats:update',
      'balance:update',
      'achievement:unlocked',
      'leaderboard:update',
    ];

    eventsToMonitor.forEach((eventType) => {
      try {
        const startTime = performance.now();
        const unsubscribe = subscribe(
          eventType,
          () => {
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            trackEvent(eventType, processingTime, false);
          },
          { priority: 'low' },
        ); // Low priority to not interfere

        monitoringSubscriptions.push(unsubscribe);
      } catch (error) {
        console.warn(`Failed to monitor event ${eventType}:`, error);
        trackEvent(eventType, 0, true);
      }
    });

    return () => {
      monitoringSubscriptions.forEach((unsub) => unsub());
    };
  }, [subscribe, trackEvent]);

  // Utility functions
  const getTopEvents = useCallback(
    (limit = 10) => {
      return Object.values(metrics.eventMetrics)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    [metrics.eventMetrics],
  );

  const getSlowestEvents = useCallback(
    (limit = 5) => {
      return Object.values(metrics.eventMetrics)
        .sort((a, b) => b.processingTime.avg - a.processingTime.avg)
        .slice(0, limit);
    },
    [metrics.eventMetrics],
  );

  const getEventFrequency = useCallback(
    (eventType: string) => {
      const event = metrics.eventMetrics[eventType];
      if (!event || event.averageInterval === 0) return 0;
      return 1000 / event.averageInterval; // Events per second
    },
    [metrics.eventMetrics],
  );

  const resetMetrics = useCallback(() => {
    setMetrics({
      totalListeners: 0,
      activeEvents: [],
      eventMetrics: {},
      performance: {
        avgEventProcessingTime: 0,
        slowestEvent: null,
        fastestEvent: null,
        errorRate: 0,
      },
      uptime: Date.now(),
      lastUpdated: Date.now(),
    });
    startTime.current = Date.now();
  }, []);

  return {
    metrics,
    trackEvent,
    getTopEvents,
    getSlowestEvents,
    getEventFrequency,
    resetMetrics,
    isHealthy: metrics.performance.errorRate < 5, // Less than 5% error rate
  };
}
