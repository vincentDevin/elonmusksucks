import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import NavBar from './NavBar';
import { ChatBar } from './ChatWidget';
import ActivityFeed from './ActivityFeed';
import { QuickThemeSwitcher } from '../theme';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { pathname } = useLocation();
  const inDashboard = pathname.startsWith('/dashboard');

  return (
    <div className="flex flex-col min-h-screen bg-background text-content transition-colors duration-300">
      <NavBar />
      <ActivityFeed />

      {/* Main content is below NavBar, but above fixed ChatBar */}
      <div className="relative flex-1">
        {/* Dashboard gets full-width treatment, other pages get container */}
        <main className={inDashboard ? 'w-full' : 'container mx-auto px-4 py-6 pb-32'}>
          {children}
        </main>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex justify-center pointer-events-auto">
          <ChatBar />
        </div>
      </div>

      {/* Quick Theme Switcher - Available on all pages */}
      <QuickThemeSwitcher position="bottom-right" hideOnMobile={false} />
    </div>
  );
}
