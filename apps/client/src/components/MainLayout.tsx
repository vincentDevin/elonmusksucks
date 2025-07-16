import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import NavBar from './NavBar';
import ParlayWidget from './ParlayWidget';
import ChatBar from './ChatBar';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { pathname } = useLocation();
  const inDashboard = pathname.startsWith('/dashboard');

  return (
    <div className="flex flex-col min-h-screen bg-background text-content transition-colors duration-300">
      <NavBar />

      {/* Main content is below NavBar, but above fixed ChatBar */}
      <div className="relative flex-1">
        {/* If you want ParlayWidget to float over content, absolutely position it here */}
        <ParlayWidget />

        {/* Main page content; add padding-bottom for chatbar space */}
        <main className="container mx-auto px-4 py-6 pb-32">{children}</main>
      </div>

      {!inDashboard && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
          <div className="flex justify-center pointer-events-auto">
            <ChatBar />
          </div>
        </div>
      )}
    </div>
  );
}
