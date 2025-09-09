import React from 'react';
import Navigation from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  clientAppUrl: string;
}

export default function Layout({ children, currentPath, clientAppUrl }: LayoutProps) {
  return (
    <>
      <Navigation currentPath={currentPath} clientAppUrl={clientAppUrl} />
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About */}
            <div>
              <h3 className="font-bold mb-4">About</h3>
              <p className="text-sm text-tertiary">
                The world's most accurate Musk weather report. Predict the chaos, earn MuskBucks.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold mb-4">Explore</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/predictions" className="text-sm text-tertiary hover:text-primary">
                    Predictions Market
                  </a>
                </li>
                <li>
                  <a href="/leaderboard" className="text-sm text-tertiary hover:text-primary">
                    Leaderboard
                  </a>
                </li>
                <li>
                  <a href="/timeline" className="text-sm text-tertiary hover:text-primary">
                    Timeline
                  </a>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="font-bold mb-4">Community</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href={`${clientAppUrl}/dashboard`}
                    className="text-sm text-tertiary hover:text-primary"
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href={`${clientAppUrl}/pong`}
                    className="text-sm text-tertiary hover:text-primary"
                  >
                    Play Pong
                  </a>
                </li>
                <li>
                  <a
                    href={`${clientAppUrl}/profile`}
                    className="text-sm text-tertiary hover:text-primary"
                  >
                    Profile
                  </a>
                </li>
              </ul>
            </div>

            {/* Join */}
            <div>
              <h3 className="font-bold mb-4">Get Started</h3>
              <div className="space-y-3">
                <a
                  href={`${clientAppUrl}/register`}
                  className="block w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover text-center font-medium transition-colors"
                >
                  Sign Up Free
                </a>
                <a
                  href={`${clientAppUrl}/login`}
                  className="block w-full px-4 py-2 border border-border text-content rounded hover:bg-muted/20 text-center transition-colors"
                >
                  Login
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-tertiary">
            <p>© 2025 ElonMuskSucks.net - Not affiliated with Elon Musk (thankfully)</p>
          </div>
        </div>
      </footer>
    </>
  );
}
