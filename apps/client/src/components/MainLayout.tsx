import type { ReactNode } from 'react';
import NavBar from './NavBar';
import { ChatBar } from './ChatWidget';
import ActivityFeed from './ActivityFeed';
import { QuickThemeSwitcher } from '../theme';
import { FloatingCreatePredictionWidget } from './prediction/FloatingCreatePredictionWidget';
import CreatePredictionModal from './prediction/CreatePredictionModal';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-content transition-colors duration-300">
      <NavBar />
      <ActivityFeed />

      {/* Main content is below NavBar, but above fixed widgets */}
      <div className="relative flex-1">
        {/* Always full-width - pages control their own layout */}
        <main className="w-full">{children}</main>
      </div>

      {/* ========================================
          Site-Wide Widget Drawer
          ========================================
          Unified area for all floating widgets:
          - ChatBar (centered, expandable)
          - QuickThemeSwitcher (bottom-right, circular)
          - Future widgets can be added here
      ======================================== */}

      {/* Chat Bar - Centered at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="flex justify-center pointer-events-auto">
          <ChatBar />
        </div>
      </div>

      {/* Quick Theme Switcher - Bottom Right (has its own fixed positioning) */}
      <QuickThemeSwitcher position="bottom-right" hideOnMobile={false} />

      {/* Create Prediction Widget - Above Theme Switcher (admin only) */}
      <FloatingCreatePredictionWidget position="bottom-right" hideOnMobile={true} />

      {/* Global Create Prediction Modal - Controlled by PredictionContext */}
      <CreatePredictionModal />

      {/* Future widgets can be added here, e.g.:
      <NotificationWidget position="bottom-left" hideOnMobile={false} />
      <HelpWidget position="top-right" hideOnMobile={true} />
      */}
    </div>
  );
}
