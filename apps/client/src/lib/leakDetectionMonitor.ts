// apps/client/src/lib/leakDetectionMonitor.ts
// Real-time leak detection monitor for development
// Continuously monitors listener counts and detects memory leaks during navigation

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface LeakSnapshot {
  route: string;
  timestamp: number;
  listenerCount: number;
  activeEvents: string[];
  contextCounts: Record<string, number>;
  memoryUsage?: number;
}

interface LeakAlert {
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
  data: any;
}

class NavigationLeakMonitor {
  private snapshots: LeakSnapshot[] = [];
  private alerts: LeakAlert[] = [];
  private isEnabled: boolean;
  private listeners: Set<(alert: LeakAlert) => void> = new Set();
  private baselineSnapshot: LeakSnapshot | null = null;

  constructor() {
    this.isEnabled =
      process.env.NODE_ENV === 'development' ||
      import.meta.env.DEV ||
      localStorage.getItem('leak_monitoring') === 'true';
  }

  /**
   * Take a snapshot of current listener state
   */
  takeSnapshot(route: string): LeakSnapshot | null {
    if (!this.isEnabled) return null;

    // Get EventBusCore metrics if available
    const eventBusCore = (window as any).__eventBusCore__;
    const listenerCount = eventBusCore?.getHandlerCount?.() || 0;
    const activeEvents = eventBusCore?.getActiveEvents?.() || [];

    // Get memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize;

    const snapshot: LeakSnapshot = {
      route,
      timestamp: Date.now(),
      listenerCount,
      activeEvents,
      contextCounts: this.getContextCounts(),
      memoryUsage,
    };

    this.snapshots.push(snapshot);

    // Keep only last 20 snapshots
    if (this.snapshots.length > 20) {
      this.snapshots = this.snapshots.slice(-20);
    }

    // Set baseline on first snapshot
    if (!this.baselineSnapshot) {
      this.baselineSnapshot = snapshot;
    }

    // Analyze for leaks
    this.analyzeSnapshot(snapshot);

    return snapshot;
  }

  /**
   * Get approximate context instance counts
   */
  private getContextCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    try {
      // This is a rough estimate based on React DevTools patterns
      // In a real implementation, you'd integrate with React DevTools Profiler
      const reactFiberRoot = document.querySelector('#root')?._reactInternalFiber;

      if (reactFiberRoot) {
        // Traverse React fiber tree to count context providers
        // This is simplified - real implementation would be more robust
        counts.estimated = 1;
      }
    } catch (error) {
      // Silent fail - this is development-only monitoring
    }

    return counts;
  }

  /**
   * Analyze snapshot for potential leaks
   */
  private analyzeSnapshot(snapshot: LeakSnapshot) {
    if (!this.baselineSnapshot || this.snapshots.length < 2) return;

    const growth = snapshot.listenerCount - this.baselineSnapshot.listenerCount;
    const recentSnapshots = this.snapshots.slice(-5);

    // Check for rapid growth
    if (growth > 20) {
      this.addAlert({
        type: 'critical',
        message: `Listener count grew by ${growth} (${this.baselineSnapshot.listenerCount} → ${snapshot.listenerCount})`,
        timestamp: Date.now(),
        data: { snapshot, baseline: this.baselineSnapshot },
      });
    } else if (growth > 10) {
      this.addAlert({
        type: 'warning',
        message: `Listener count increased by ${growth} since baseline`,
        timestamp: Date.now(),
        data: { snapshot, baseline: this.baselineSnapshot },
      });
    }

    // Check for consistent growth pattern
    if (recentSnapshots.length >= 5) {
      const isConsistentGrowth = recentSnapshots.every((snap, index) => {
        if (index === 0) return true;
        return snap.listenerCount >= recentSnapshots[index - 1].listenerCount;
      });

      if (isConsistentGrowth && growth > 5) {
        this.addAlert({
          type: 'warning',
          message: `Consistent listener growth pattern detected over ${recentSnapshots.length} navigations`,
          timestamp: Date.now(),
          data: { recentSnapshots },
        });
      }
    }

    // Check memory usage if available
    if (snapshot.memoryUsage && this.baselineSnapshot.memoryUsage) {
      const memoryGrowth = snapshot.memoryUsage - this.baselineSnapshot.memoryUsage;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      if (memoryGrowthMB > 50) {
        // 50MB growth
        this.addAlert({
          type: 'critical',
          message: `High memory growth: +${memoryGrowthMB.toFixed(1)}MB`,
          timestamp: Date.now(),
          data: { memoryGrowth, snapshot },
        });
      }
    }
  }

  /**
   * Add alert and notify listeners
   */
  private addAlert(alert: LeakAlert) {
    this.alerts.push(alert);

    // Keep only last 10 alerts
    if (this.alerts.length > 10) {
      this.alerts = this.alerts.slice(-10);
    }

    // Console log for immediate visibility
    const icon = alert.type === 'critical' ? '🚨' : '⚠️';
    console.group(`${icon} [LEAK MONITOR] ${alert.message}`);
    console.log('Data:', alert.data);
    console.log('Time:', new Date(alert.timestamp).toLocaleTimeString());
    console.groupEnd();

    // Notify subscribers
    this.listeners.forEach((listener) => listener(alert));
  }

  /**
   * Subscribe to leak alerts
   */
  subscribe(listener: (alert: LeakAlert) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    if (!this.baselineSnapshot || this.snapshots.length === 0) {
      return { noData: true };
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    const listenerGrowth = latest.listenerCount - this.baselineSnapshot.listenerCount;

    return {
      baseline: this.baselineSnapshot.listenerCount,
      current: latest.listenerCount,
      growth: listenerGrowth,
      growthPercentage:
        this.baselineSnapshot.listenerCount > 0
          ? ((listenerGrowth / this.baselineSnapshot.listenerCount) * 100).toFixed(1)
          : '0',
      snapshotCount: this.snapshots.length,
      alertCount: this.alerts.length,
      recentAlerts: this.alerts.slice(-3),
      memoryGrowth: this.getMemoryGrowth(),
    };
  }

  /**
   * Get memory growth statistics
   */
  private getMemoryGrowth() {
    if (!this.baselineSnapshot?.memoryUsage || this.snapshots.length === 0) {
      return null;
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    if (!latest.memoryUsage) return null;

    const growthBytes = latest.memoryUsage - this.baselineSnapshot.memoryUsage;
    const growthMB = growthBytes / (1024 * 1024);

    return {
      baseline: (this.baselineSnapshot.memoryUsage / (1024 * 1024)).toFixed(1),
      current: (latest.memoryUsage / (1024 * 1024)).toFixed(1),
      growth: growthMB.toFixed(1),
    };
  }

  /**
   * Print detailed report
   */
  printReport() {
    const stats = this.getStats();

    if ('noData' in stats) {
      console.log('📊 No leak monitoring data available');
      return;
    }

    console.group('🔍 Navigation Leak Monitor Report');
    console.log(
      `Listeners: ${stats.baseline} → ${stats.current} (${stats.growth >= 0 ? '+' : ''}${stats.growth}, ${stats.growthPercentage}%)`,
    );

    if (stats.memoryGrowth) {
      console.log(
        `Memory: ${stats.memoryGrowth.baseline}MB → ${stats.memoryGrowth.current}MB (+${stats.memoryGrowth.growth}MB)`,
      );
    }

    console.log(`Snapshots: ${stats.snapshotCount}, Alerts: ${stats.alertCount}`);

    if (stats.recentAlerts.length > 0) {
      console.log('\n⚠️ Recent Alerts:');
      stats.recentAlerts.forEach((alert) => {
        console.log(`  ${alert.type.toUpperCase()}: ${alert.message}`);
      });
    }

    console.log('\n📈 Navigation History:');
    console.table(
      this.snapshots.map((snap) => ({
        route: snap.route,
        listeners: snap.listenerCount,
        events: snap.activeEvents.length,
        time: new Date(snap.timestamp).toLocaleTimeString(),
      })),
    );

    console.groupEnd();
  }

  /**
   * Reset monitoring state
   */
  reset() {
    this.snapshots = [];
    this.alerts = [];
    this.baselineSnapshot = null;
    console.log('🧹 [LEAK MONITOR] Reset monitoring state');
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('leak_monitoring', enabled.toString());
    console.log(`🔍 [LEAK MONITOR] ${enabled ? 'Enabled' : 'Disabled'}`);
  }
}

// Global singleton
export const leakMonitor = new NavigationLeakMonitor();

/**
 * React hook for navigation leak monitoring
 */
export function useNavigationLeakMonitor() {
  const location = useLocation();
  const [alerts, setAlerts] = useState<LeakAlert[]>([]);
  const alertSubscription = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Take snapshot on route change
    leakMonitor.takeSnapshot(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    // Subscribe to alerts
    alertSubscription.current = leakMonitor.subscribe((alert) => {
      setAlerts((prev) => [...prev.slice(-9), alert]); // Keep last 10 alerts
    });

    return () => {
      alertSubscription.current?.();
    };
  }, []);

  const getStats = useCallback(() => leakMonitor.getStats(), []);
  const printReport = useCallback(() => leakMonitor.printReport(), []);
  const reset = useCallback(() => {
    leakMonitor.reset();
    setAlerts([]);
  }, []);

  return {
    alerts,
    getStats,
    printReport,
    reset,
    enabled: leakMonitor['isEnabled'],
    setEnabled: (enabled: boolean) => leakMonitor.setEnabled(enabled),
  };
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).leakMonitor = leakMonitor;
}
