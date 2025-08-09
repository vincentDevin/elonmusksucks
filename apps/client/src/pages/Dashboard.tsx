// apps/client/src/pages/Dashboard.tsx
import { useState } from 'react';
import UnifiedDashboardSettings from '../components/dashboard/customization/UnifiedDashboardSettings';
import MobileDashboard from '../components/dashboard/mobile/MobileDashboard';
import DesktopDashboard from '../components/dashboard/desktop/DesktopDashboard';
import { useMobileOptimization } from '../hooks/useMobileOptimization';

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
      <>
        <MobileDashboard />
        <UnifiedDashboardSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </>
    );
  }

  // Desktop layout - sophisticated multi-column design
  return <DesktopDashboard />;
}
