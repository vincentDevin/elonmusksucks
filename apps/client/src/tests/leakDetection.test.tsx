// apps/client/src/tests/leakDetection.test.tsx
// Automated leak detection tests for navigation cycles
// Monitors EventBus listeners, context cleanup, and memory usage during navigation

import React, { useState } from 'react';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock contexts and components for testing
import { EventBusCoreProvider } from '../contexts/EventBusCoreContext';
import { AuthProvider } from '../contexts/AuthContext';
import { AchievementProvider } from '../contexts/AchievementContext';
import { UserDataProvider } from '../contexts/UserDataContext';
import { ActivityProvider } from '../contexts/ActivityContext';

// Mock components that represent different pages
const Dashboard = () => <div data-testid="dashboard">Dashboard</div>;
const Profile = () => <div data-testid="profile">Profile</div>;
const Predictions = () => <div data-testid="predictions">Predictions</div>;

// Navigation controller for testing
const NavigationController = ({ onNavigate }: { onNavigate?: (path: string) => void }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (onNavigate) {
      // Store navigate function for external control
      (window as any).testNavigate = (path: string) => {
        navigate(path);
        onNavigate(path);
      };
    }
  }, [navigate, onNavigate]);

  return null;
};

// Test wrapper with all providers
const TestAppWrapper: React.FC<{
  children: React.ReactNode;
  initialRoute?: string;
  onNavigate?: (path: string) => void;
}> = ({ children, initialRoute = '/', onNavigate }) => (
  <MemoryRouter initialEntries={[initialRoute]}>
    <EventBusCoreProvider>
      <AuthProvider>
        <UserDataProvider>
          <AchievementProvider>
            <ActivityProvider>
              <NavigationController onNavigate={onNavigate} />
              {children}
            </ActivityProvider>
          </AchievementProvider>
        </UserDataProvider>
      </AuthProvider>
    </EventBusCoreProvider>
  </MemoryRouter>
);

// Navigation test routes
const NavigationTestRoutes = () => (
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/predictions" element={<Predictions />} />
  </Routes>
);

// Memory and listener tracking utilities
class LeakDetector {
  private initialListenerCount = 0;
  private listenerSnapshots: Array<{
    route: string;
    count: number;
    timestamp: number;
    activeEvents: string[];
  }> = [];

  // Use real EventBusCore if available, fallback to mock
  private getEventBusCore() {
    return (window as any).__eventBusCore__ || this.mockEventBus;
  }

  // Mock EventBusCore for testing (fallback)
  private mockEventBus = {
    listeners: new Map<string, Set<any>>(),
    subscribe: vi.fn((event: string, handler: any) => {
      if (!this.mockEventBus.listeners.has(event)) {
        this.mockEventBus.listeners.set(event, new Set());
      }
      this.mockEventBus.listeners.get(event)!.add(handler);

      return () => {
        const handlers = this.mockEventBus.listeners.get(event);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            this.mockEventBus.listeners.delete(event);
          }
        }
      };
    }),
    getHandlerCount: vi.fn(() => {
      let total = 0;
      this.mockEventBus.listeners.forEach((handlers) => {
        total += handlers.size;
      });
      return total;
    }),
    getActiveEvents: vi.fn(() => {
      return Array.from(this.mockEventBus.listeners.keys());
    }),
  };

  setupBaseline() {
    const eventBus = this.getEventBusCore();
    this.initialListenerCount = eventBus.getHandlerCount?.() || 0;
  }

  takeSnapshot(route: string) {
    const eventBus = this.getEventBusCore();
    const snapshot = {
      route,
      count: eventBus.getHandlerCount?.() || 0,
      timestamp: Date.now(),
      activeEvents: eventBus.getActiveEvents?.() || [],
    };
    this.listenerSnapshots.push(snapshot);
    return snapshot;
  }

  detectLeaks() {
    const eventBus = this.getEventBusCore();
    const currentCount = eventBus.getHandlerCount?.() || 0;
    const growth = currentCount - this.initialListenerCount;

    const suspiciousGrowth = this.listenerSnapshots.filter((snapshot, index) => {
      if (index === 0) return false;
      const previous = this.listenerSnapshots[index - 1];
      return snapshot.count > previous.count + 2; // Allow for some expected growth
    });

    return {
      hasLeaks: growth > 5, // More than 5 listeners is suspicious
      totalGrowth: growth,
      currentCount,
      initialCount: this.initialListenerCount,
      suspiciousGrowth,
      snapshots: this.listenerSnapshots,
    };
  }

  getReport() {
    const leaks = this.detectLeaks();
    return {
      ...leaks,
      summary: `Listeners: ${leaks.initialCount} → ${leaks.currentCount} (${leaks.totalGrowth >= 0 ? '+' : ''}${leaks.totalGrowth})`,
      events: this.mockEventBus.getActiveEvents(),
    };
  }

  reset() {
    this.mockEventBus.listeners.clear();
    this.listenerSnapshots = [];
    this.initialListenerCount = 0;
  }
}

describe('Memory Leak Detection Tests', () => {
  let leakDetector: LeakDetector;

  beforeEach(() => {
    leakDetector = new LeakDetector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    leakDetector.reset();
  });

  describe('Navigation Cycle Tests', () => {
    it('should not leak listeners during basic navigation cycles', async () => {
      const navigationPaths: string[] = [];

      render(
        <TestAppWrapper initialRoute="/" onNavigate={(path) => navigationPaths.push(path)}>
          <NavigationTestRoutes />
        </TestAppWrapper>,
      );

      // Establish baseline
      leakDetector.setupBaseline();
      leakDetector.takeSnapshot('dashboard-initial');

      // Verify initial state
      expect(document.querySelector('[data-testid="dashboard"]')).toBeInTheDocument();

      // Navigate to profile
      act(() => {
        (window as any).testNavigate('/profile');
      });

      await waitFor(
        () => {
          expect(document.querySelector('[data-testid="profile"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      leakDetector.takeSnapshot('profile');

      // Navigate to predictions
      act(() => {
        (window as any).testNavigate('/predictions');
      });

      await waitFor(
        () => {
          expect(document.querySelector('[data-testid="predictions"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      leakDetector.takeSnapshot('predictions');

      // Return to dashboard
      act(() => {
        (window as any).testNavigate('/');
      });

      await waitFor(
        () => {
          expect(document.querySelector('[data-testid="dashboard"]')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      leakDetector.takeSnapshot('dashboard-return');

      // Check for leaks
      const report = leakDetector.getReport();

      console.log('🔍 Navigation Cycle Report:', report.summary);
      console.log('📍 Navigation Path:', navigationPaths.join(' → '));
      console.table(report.snapshots);

      expect(report.hasLeaks).toBe(false);
      expect(report.totalGrowth).toBeLessThanOrEqual(2); // Allow minimal growth
    });

    it('should handle rapid navigation without accumulating listeners', async () => {
      const routes = ['/profile', '/predictions', '/', '/profile', '/', '/predictions', '/'];

      render(
        <TestAppWrapper initialRoute="/">
          <NavigationTestRoutes />
        </TestAppWrapper>,
      );

      leakDetector.setupBaseline();
      leakDetector.takeSnapshot('rapid-start');

      // Rapid navigation sequence
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];

        act(() => {
          (window as any).testNavigate(route);
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
        });

        leakDetector.takeSnapshot(`rapid-nav-${i}-${route.replace('/', 'root')}`);
      }

      const report = leakDetector.getReport();

      console.log('🏃‍♂️ Rapid Navigation Report:', report.summary);

      // Rapid navigation should not cause significant listener accumulation
      expect(report.totalGrowth).toBeLessThanOrEqual(3);
      expect(report.suspiciousGrowth.length).toBeLessThanOrEqual(1);
    });

    it('should properly cleanup contexts on unmount', async () => {
      const TestComponent = () => (
        <TestAppWrapper>
          <NavigationTestRoutes />
        </TestAppWrapper>
      );

      leakDetector.setupBaseline();

      // Mount the component
      const { unmount } = render(<TestComponent />);
      leakDetector.takeSnapshot('mounted');

      // Unmount the component
      unmount();
      leakDetector.takeSnapshot('unmounted');

      // After unmounting, listener count should return to baseline or lower
      const report = leakDetector.getReport();
      const finalSnapshot = report.snapshots[report.snapshots.length - 1];

      console.log('🗑️ Cleanup Test Report:', report.summary);

      expect(finalSnapshot.count).toBeLessThanOrEqual(leakDetector['initialListenerCount'] + 1);
    });
  });

  describe('Context Provider Tests', () => {
    it('should not create duplicate providers during remounting', async () => {
      leakDetector.setupBaseline();

      // Mount and unmount multiple times
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(
          <TestAppWrapper>
            <Dashboard />
          </TestAppWrapper>,
        );

        leakDetector.takeSnapshot(`mount-${i}`);
        unmount();
        leakDetector.takeSnapshot(`unmount-${i}`);
      }

      const report = leakDetector.getReport();

      console.log('🔄 Remount Test Report:', report.summary);

      // Multiple mounts/unmounts should not cause exponential growth
      expect(report.totalGrowth).toBeLessThanOrEqual(2);
    });

    it('should handle auth state changes without leaking', async () => {
      const AuthStateTest = ({ isAuthenticated }: { isAuthenticated: boolean }) => (
        <TestAppWrapper>
          <div data-testid={`auth-${isAuthenticated}`}>
            Auth State: {isAuthenticated ? 'Logged In' : 'Logged Out'}
          </div>
        </TestAppWrapper>
      );

      leakDetector.setupBaseline();

      // Test auth state transitions
      const { rerender } = render(<AuthStateTest isAuthenticated={false} />);
      leakDetector.takeSnapshot('logged-out');

      rerender(<AuthStateTest isAuthenticated={true} />);
      leakDetector.takeSnapshot('logged-in');

      rerender(<AuthStateTest isAuthenticated={false} />);
      leakDetector.takeSnapshot('logged-out-again');

      const report = leakDetector.getReport();

      console.log('👤 Auth State Test Report:', report.summary);

      // Auth state changes should not cause significant listener growth
      expect(report.totalGrowth).toBeLessThanOrEqual(1);
    });
  });

  describe('Real-world Integration Tests', () => {
    it('should integrate with the actual leak detection monitor', async () => {
      // Import the real leak monitor
      const { leakMonitor } = await import('../lib/leakDetectionMonitor');

      render(
        <TestAppWrapper initialRoute="/">
          <NavigationTestRoutes />
        </TestAppWrapper>,
      );

      // Reset and enable the real leak monitor
      leakMonitor.reset();
      leakMonitor.setEnabled(true);

      // Take baseline snapshot with real monitor
      const initialSnapshot = leakMonitor.takeSnapshot('/');

      // Navigate and take snapshots
      act(() => {
        (window as any).testNavigate('/profile');
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      const profileSnapshot = leakMonitor.takeSnapshot('/profile');

      act(() => {
        (window as any).testNavigate('/predictions');
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      const predictionsSnapshot = leakMonitor.takeSnapshot('/predictions');

      // Get final stats from real monitor
      const stats = leakMonitor.getStats();

      console.log('🔍 Real Monitor Integration Report:');
      if ('noData' in stats) {
        console.log('  No data available from real monitor');
      } else {
        console.log(
          `  Listeners: ${stats.baseline} → ${stats.current} (${stats.growth >= 0 ? '+' : ''}${stats.growth})`,
        );
        console.log(`  Growth: ${stats.growthPercentage}%`);
        console.log(`  Snapshots: ${stats.snapshotCount}`);
      }

      // Verify integration is working
      expect(initialSnapshot).toBeTruthy();
      expect(profileSnapshot).toBeTruthy();
      expect(predictionsSnapshot).toBeTruthy();

      // If we have real data, validate it
      if (!('noData' in stats)) {
        expect(stats.snapshotCount).toBeGreaterThanOrEqual(3);
        expect(Math.abs(stats.growth)).toBeLessThanOrEqual(10); // Reasonable growth limit
      }
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain listener counts within acceptable limits', async () => {
      const ACCEPTABLE_LISTENER_LIMIT = 50; // Adjust based on app complexity

      leakDetector.setupBaseline();

      // Simulate complex user session
      const userActions = [
        { route: '/', action: 'dashboard-load' },
        { route: '/profile', action: 'profile-view' },
        { route: '/predictions', action: 'predictions-browse' },
        { route: '/', action: 'dashboard-return' },
        { route: '/profile', action: 'profile-edit' },
        { route: '/', action: 'dashboard-final' },
      ];

      for (const { route, action } of userActions) {
        const { rerender } = render(
          <TestAppWrapper initialRoute={route}>
            <NavigationTestRoutes />
          </TestAppWrapper>,
        );

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        const snapshot = leakDetector.takeSnapshot(action);

        // Fail fast if listener count gets too high
        expect(snapshot.count).toBeLessThan(ACCEPTABLE_LISTENER_LIMIT);

        cleanup();
      }

      const report = leakDetector.getReport();

      console.log('📊 Performance Test Report:', report.summary);
      console.log(
        '📈 Listener Growth Pattern:',
        report.snapshots.map((s) => `${s.route}: ${s.count}`).join(' → '),
      );

      expect(report.hasLeaks).toBe(false);
    });
  });
});

// Export utilities for manual testing
export { LeakDetector, TestAppWrapper };
