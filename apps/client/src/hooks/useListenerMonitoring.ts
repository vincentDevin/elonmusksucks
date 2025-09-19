// useListenerMonitoring.ts - Development-only memory leak detection
// SAFETY: Monitors listener counts to detect memory leaks before they become critical

import { useEffect, useRef } from 'react';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import { useSocket } from '../contexts/SocketContext';

// Warning thresholds for listener counts
const LISTENER_THRESHOLDS = {
  WARN: 20, // Start warning
  CRITICAL: 50, // Critical threshold
  EMERGENCY: 100, // Emergency threshold
} as const;

// Monitoring configuration
const MONITORING_CONFIG = {
  CHECK_INTERVAL_MS: 10000, // Check every 10 seconds
  LOG_INTERVAL_MS: 30000, // Log detailed stats every 30 seconds
  HISTORY_SIZE: 20, // Keep last 20 measurements for trend analysis
} as const;

interface ListenerSnapshot {
  timestamp: number;
  totalListeners: number;
  eventCounts: Record<string, number>;
  socketListeners: number;
}

/**
 * Development-only hook to monitor listener counts and detect memory leaks
 *
 * PREVENTS: Memory leaks from accumulated listeners
 * DETECTS: Trending upward listener growth
 * ALERTS: When thresholds are exceeded
 * LOGS: Unhandled events coming through EventBusCore
 *
 * Only active in development mode for zero production overhead
 */
export const useListenerMonitoring = () => {
  const { getHandlerCount, getActiveEvents, subscribe } = useEventBusCore();
  const socket = useSocket();
  const historyRef = useRef<ListenerSnapshot[]>([]);
  const lastLogRef = useRef<number>(0);
  const unhandledEventsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Log events that might be unhandled or have excessive listeners
    const suspiciousEvents = ['pong:elo:update', 'pong:tier:change', 'bet:placed', 'chat:message'];
    const unsubscribers: (() => void)[] = [];

    suspiciousEvents.forEach((eventName) => {
      const unsubscribe = subscribe(eventName as any, (payload) => {
        const currentCount = unhandledEventsRef.current.get(eventName) || 0;
        unhandledEventsRef.current.set(eventName, currentCount + 1);

        console.log(`🔍 [EVENT LOGGER] ${eventName} received:`, {
          payload,
          totalReceived: currentCount + 1,
          timestamp: new Date().toISOString(),
        });
      });
      unsubscribers.push(unsubscribe);
    });

    const checkListeners = () => {
      const now = Date.now();
      const totalListeners = getHandlerCount();
      const activeEvents = getActiveEvents();

      // Get counts per event
      const eventCounts: Record<string, number> = {};
      activeEvents.forEach((event) => {
        if (event && event.trim()) {
          // Filter out undefined/empty events
          eventCounts[event] = getHandlerCount(event);
        }
      });

      // Count socket listeners (Socket.IO internal)
      const socketListeners = socket.listeners ? Object.keys(socket.listeners()).length : 0;

      // Create snapshot
      const snapshot: ListenerSnapshot = {
        timestamp: now,
        totalListeners,
        eventCounts,
        socketListeners,
      };

      // Add to history
      historyRef.current.push(snapshot);
      if (historyRef.current.length > MONITORING_CONFIG.HISTORY_SIZE) {
        historyRef.current.shift();
      }

      // Check thresholds and alert if necessary
      checkThresholds(snapshot);

      // Periodic detailed logging
      if (now - lastLogRef.current > MONITORING_CONFIG.LOG_INTERVAL_MS) {
        logDetailedStats(snapshot);
        lastLogRef.current = now;
      }
    };

    const checkThresholds = (snapshot: ListenerSnapshot) => {
      const { totalListeners, eventCounts } = snapshot;

      // Check total listener count
      if (totalListeners >= LISTENER_THRESHOLDS.EMERGENCY) {
        console.error(
          `🚨 [LISTENER MONITOR] EMERGENCY: ${totalListeners} total listeners! Memory leak detected!`,
        );
        console.error('Event breakdown:', eventCounts);
        console.error('Consider checking useRoomLifecycle usage and component cleanup');
      } else if (totalListeners >= LISTENER_THRESHOLDS.CRITICAL) {
        console.warn(
          `🔥 [LISTENER MONITOR] CRITICAL: ${totalListeners} total listeners! Investigate immediately`,
        );
        console.warn('Event breakdown:', eventCounts);
      } else if (totalListeners >= LISTENER_THRESHOLDS.WARN) {
        console.warn(`⚠️ [LISTENER MONITOR] WARNING: ${totalListeners} total listeners`);
      }

      // Check individual events for concentration
      Object.entries(eventCounts).forEach(([event, count]) => {
        if (count > 10) {
          console.warn(`📡 [LISTENER MONITOR] High listener count for ${event}: ${count}`);
        }
      });

      // Trend analysis (if we have enough history)
      if (historyRef.current.length >= 5) {
        const trend = analyzeTrend();
        if (trend.isIncreasing && trend.rate > 2) {
          console.warn(
            `📈 [LISTENER MONITOR] TREND ALERT: Listeners increasing by ${trend.rate.toFixed(1)}/minute`,
          );
        }
      }
    };

    const analyzeTrend = () => {
      const history = historyRef.current;
      if (history.length < 3) return { isIncreasing: false, rate: 0 };

      const recent = history.slice(-5);
      const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
      const listenerChange = recent[recent.length - 1].totalListeners - recent[0].totalListeners;

      const rate = (listenerChange / timeSpan) * 60000; // Per minute

      return {
        isIncreasing: listenerChange > 0,
        rate: Math.abs(rate),
      };
    };

    const logDetailedStats = (snapshot: ListenerSnapshot) => {
      const { totalListeners, eventCounts, socketListeners } = snapshot;

      console.group(`📊 [LISTENER MONITOR] Stats - ${new Date().toLocaleTimeString()}`);
      console.log(`Total EventBus listeners: ${totalListeners}`);
      console.log(`Socket.IO listeners: ${socketListeners}`);

      if (Object.keys(eventCounts).length > 0) {
        console.log('Event breakdown:');
        Object.entries(eventCounts)
          .sort(([, a], [, b]) => b - a) // Sort by count descending
          .forEach(([event, count]) => {
            const status = count > 5 ? '⚠️' : count > 2 ? '📡' : '✅';
            console.log(`  ${status} ${event}: ${count}`);
          });
      } else {
        console.log('No active event listeners');
      }

      // Show trend if available
      if (historyRef.current.length >= 3) {
        const trend = analyzeTrend();
        const trendIcon = trend.isIncreasing ? '📈' : '📉';
        console.log(
          `${trendIcon} Trend: ${trend.isIncreasing ? '+' : ''}${trend.rate.toFixed(1)} listeners/minute`,
        );
      }

      // Show unhandled events summary
      if (unhandledEventsRef.current.size > 0) {
        console.log('🔍 Suspicious events received:');
        Array.from(unhandledEventsRef.current.entries())
          .sort(([, a], [, b]) => b - a)
          .forEach(([event, count]) => {
            console.log(`  📨 ${event}: ${count} events received`);
          });
      }

      console.groupEnd();
    };

    // Start monitoring
    console.log('🔍 [LISTENER MONITOR] Starting development listener monitoring');

    // Immediate check
    checkListeners();

    // Set up interval
    const interval = setInterval(checkListeners, MONITORING_CONFIG.CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      unsubscribers.forEach((unsub) => unsub());
      console.log('🔍 [LISTENER MONITOR] Stopped');
    };
  }, [getHandlerCount, getActiveEvents, socket]);
};

/**
 * Helper hook to manually check listener stats
 * Useful for debugging specific components
 */
export const useListenerDebugger = () => {
  const { getHandlerCount, getActiveEvents } = useEventBusCore();

  const logCurrentStats = () => {
    if (process.env.NODE_ENV !== 'development') return;

    const totalListeners = getHandlerCount();
    const activeEvents = getActiveEvents();

    console.group('🔍 [LISTENER DEBUGGER] Current Stats');
    console.log(`Total listeners: ${totalListeners}`);
    activeEvents.forEach((event) => {
      console.log(`${event}: ${getHandlerCount(event)}`);
    });
    console.groupEnd();
  };

  return { logCurrentStats };
};

export default useListenerMonitoring;
