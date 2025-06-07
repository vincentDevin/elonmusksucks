import type { ReactNode } from 'react';
import NavBar from './NavBar';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({
  children,
}: MainLayoutProps) {
  return (
    <div className="
      flex flex-col min-h-screen
      bg-background text-content
      transition-colors duration-300
    ">
      <NavBar />
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}