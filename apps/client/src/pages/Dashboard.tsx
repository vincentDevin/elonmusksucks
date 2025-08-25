// apps/client/src/pages/Dashboard.tsx
// Rollback: Remove UserDataProvider wrapper and restore direct hook usage
// Rollback: Remove Suspense usage - handled at route level
import { useState } from 'react';
import DashboardSettings from '../components/dashboard/customization/DashboardSettings';
import MobileDashboard from '../components/dashboard/mobile/MobileDashboard';
import DesktopDashboard from '../components/dashboard/desktop/DesktopDashboard';
import { useMobileOptimization } from '../hooks/useMobileOptimization';
import { UserDataProvider } from '../contexts/UserDataContext';

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
