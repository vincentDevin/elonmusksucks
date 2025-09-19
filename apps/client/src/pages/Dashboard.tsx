// apps/client/src/pages/Dashboard.tsx
// PERFORMANCE & SAFETY: UserDataProvider wrapper with hydration guards + room lifecycle management
import { useState } from 'react';
import DashboardSettings from '../components/dashboard/customization/DashboardSettings';
import MobileDashboard from '../components/dashboard/mobile/MobileDashboard';
import DesktopDashboard from '../components/dashboard/desktop/DesktopDashboard';
import { useMobileOptimization } from '../hooks/useMobileOptimization';
import { useRoomLifecycle } from '../hooks/useRoomLifecycle';
import { UserDataProvider } from '../contexts/UserDataContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Responsive Dashboard Layout
 * ──────────────────────────────────────────────────────────────
 * • Mobile  (<768px)   : Mobile-optimized tabbed interface
 * • Tablet  (768-1024) : Adaptive layout based on orientation
 * • Desktop (1024+)    : Sophisticated multi-column layout
 * • Ultra-wide (1600+) : Advanced 3-4 column trading interface
 */
export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const { shouldUseCompactLayout } = useMobileOptimization();
  const { user } = useAuth();

  // CRITICAL SAFETY: Automatic room lifecycle management
  // Joins user room + leaderboard on mount, leaves on unmount (prevents memory leaks)
  useRoomLifecycle(
    [
      `user:${user?.id}`, // Personal notifications
      'leaderboard:daily', // Live leaderboard updates
      'predictions:active', // Active prediction updates
      'achievements:global', // Global achievement notifications
    ].filter(Boolean),
  ); // Filter out undefined user rooms

  // Use mobile layout for mobile devices and portrait tablets
  if (shouldUseCompactLayout()) {
    return (
      <UserDataProvider>
        <MobileDashboard />
        <DashboardSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </UserDataProvider>
    );
  }

  // Desktop layout - sophisticated multi-column design
  return (
    <UserDataProvider>
      <DesktopDashboard />
    </UserDataProvider>
  );
}
