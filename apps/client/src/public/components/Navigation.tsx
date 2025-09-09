import React from 'react';
import ThemeToggle from './ThemeToggle';

interface NavigationProps {
  currentPath: string;
  clientAppUrl: string;
}

export default function Navigation({ currentPath, clientAppUrl }: NavigationProps) {
  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="bg-surface shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Home */}
          <div className="flex items-center space-x-8">
            <a
              href="/"
              className="text-xl font-bold text-content hover:text-primary transition-colors"
            >
              ElonMuskSucks.net
            </a>

            {/* Main Nav Links */}
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="/"
                className={`font-medium transition-colors ${
                  isActive('/') ? 'text-primary' : 'text-content hover:text-primary'
                }`}
              >
                Home
              </a>
              <a
                href="/predictions"
                className={`font-medium transition-colors ${
                  isActive('/predictions') ? 'text-primary' : 'text-content hover:text-primary'
                }`}
              >
                Predictions
              </a>
              <a
                href="/leaderboard"
                className={`font-medium transition-colors ${
                  isActive('/leaderboard') ? 'text-primary' : 'text-content hover:text-primary'
                }`}
              >
                Leaderboard
              </a>
              <a
                href="/timeline"
                className={`font-medium transition-colors ${
                  isActive('/timeline') ? 'text-primary' : 'text-content hover:text-primary'
                }`}
              >
                Timeline
              </a>
            </div>
          </div>

          {/* Theme Toggle and Auth Links */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <a
              href={`${clientAppUrl}/login`}
              className="font-medium text-content hover:text-primary transition-colors"
            >
              Login
            </a>
            <a
              href={`${clientAppUrl}/register`}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium transition-colors"
            >
              Sign Up
            </a>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden border-t border-border">
          <div className="flex flex-col space-y-2 py-3">
            <a
              href="/"
              className={`px-4 py-2 font-medium transition-colors ${
                isActive('/') ? 'text-primary bg-muted/20' : 'text-content'
              }`}
            >
              Home
            </a>
            <a
              href="/predictions"
              className={`px-4 py-2 font-medium transition-colors ${
                isActive('/predictions') ? 'text-primary bg-muted/20' : 'text-content'
              }`}
            >
              Predictions
            </a>
            <a
              href="/leaderboard"
              className={`px-4 py-2 font-medium transition-colors ${
                isActive('/leaderboard') ? 'text-primary bg-muted/20' : 'text-content'
              }`}
            >
              Leaderboard
            </a>
            <a
              href="/timeline"
              className={`px-4 py-2 font-medium transition-colors ${
                isActive('/timeline') ? 'text-primary bg-muted/20' : 'text-content'
              }`}
            >
              Timeline
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
