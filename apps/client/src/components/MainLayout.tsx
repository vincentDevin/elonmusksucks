// apps/client/src/components/MainLayout.tsx
import type { ReactNode } from 'react';
import NavBar from './NavBar';
import ParlayWidget from './ParlayWidget';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div
      className="
        flex flex-col min-h-screen
        bg-background text-content
        transition-colors duration-300
      "
    >
      <NavBar />

      {/* make this relative so ParlayWidget can absolute‐position itself here */}
      <div className="relative flex-1">
        <ParlayWidget />

        <main className="container mx-auto px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
