// apps/client/src/components/NavBar.tsx
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { LightDarkToggle } from '../theme';
import { formatMuskBucks, getMuskBucksColorClasses } from '../utils/formatting';

/**
 * Updated NavBar component using the unified theme system
 * Replaces the old NavBar with conflicting theme toggle
 */
export default function NavBar() {
  const { accessToken, logout, user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClasses = (path: string) =>
    `px-3 py-2 rounded ${
      loc.pathname === path ? 'bg-primary text-white' : 'hover:bg-muted transition-colors'
    }`;

  const mobileLinkClasses = (path: string) =>
    `block px-4 py-3 rounded-lg ${
      loc.pathname === path ? 'bg-primary text-white' : 'hover:bg-muted transition-colors'
    }`;

  return (
    <header className="relative z-60 border-b border-muted bg-surface text-content">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link to="/" className="text-xl font-bold">
          🚀 ElonMuskSucks
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
          {accessToken ? (
            user ? (
              <>
                <Link to="/dashboard" className={linkClasses('/dashboard')}>
                  Dashboard
                </Link>
                <Link to="/timeline" className={linkClasses('/timeline')}>
                  Timeline
                </Link>
                <Link to="/predictions" className={linkClasses('/predictions')}>
                  Predictions
                </Link>
                <Link to="/leaderboard" className={linkClasses('/leaderboard')}>
                  Leaderboard
                </Link>
                <Link to="/pong" className={linkClasses('/pong')}>
                  🏓 Pong
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-3 px-3 py-2 rounded hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{user.name}</span>
                    <div
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 ${getMuskBucksColorClasses(user.muskBucks)}`}
                    >
                      <span>{formatMuskBucks(user.muskBucks)}</span>
                      <span>🪙</span>
                    </div>
                  </button>
                  {dropdownOpen && (
                    <ul
                      className="
                        absolute right-0 mt-2 z-[100]
                        bg-surface text-content
                        border border-muted rounded shadow-xl
                        space-y-1 p-2 w-40
                        transition-colors
                      "
                    >
                      {user.role === 'ADMIN' && (
                        <li>
                          <Link
                            to="/admin"
                            className="block px-3 py-2 rounded hover:bg-muted transition-colors"
                            onClick={() => setDropdownOpen(false)}
                          >
                            Admin
                          </Link>
                        </li>
                      )}
                      <li>
                        <Link
                          to={`/profile/${user.id}`}
                          className="block px-3 py-2 rounded hover:bg-muted transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Profile
                        </Link>
                      </li>
                      <li>
                        <button
                          onClick={handleLogout}
                          className="
                            w-full text-left px-3 py-2 rounded
                            hover:bg-error hover:text-white
                            transition-colors
                          "
                        >
                          Logout
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="px-3 py-2">Loading...</div>
            )
          ) : (
            <>
              <Link to="/public" className={linkClasses('/public')}>
                Home
              </Link>
              <Link to="/public/predictions" className={linkClasses('/public/predictions')}>
                Predictions
              </Link>
              <Link to="/public/leaderboard" className={linkClasses('/public/leaderboard')}>
                Leaderboard
              </Link>
              <Link to="/public/timeline" className={linkClasses('/public/timeline')}>
                Timeline
              </Link>
              <Link to="/login" className={linkClasses('/login')}>
                Login
              </Link>
              <Link to="/register" className={linkClasses('/register')}>
                Register
              </Link>
            </>
          )}

          {/* Unified Theme Toggle - Simple light/dark mode */}
          <LightDarkToggle variant="icon" size="md" className="ml-4" />
        </nav>

        {/* Mobile Controls */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Mobile Theme Toggle */}
          <LightDarkToggle variant="icon" size="sm" />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="p-2 rounded hover:bg-muted transition-colors"
          >
            {mobileMenuOpen ? <FaTimes className="text-lg" /> : <FaBars className="text-lg" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-surface border-b border-muted shadow-lg">
          <div className="container mx-auto p-4 space-y-2">
            {accessToken ? (
              user ? (
                <>
                  <Link
                    to="/dashboard"
                    className={mobileLinkClasses('/dashboard')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/timeline"
                    className={mobileLinkClasses('/timeline')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Timeline
                  </Link>
                  <Link
                    to="/predictions"
                    className={mobileLinkClasses('/predictions')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Predictions
                  </Link>
                  <Link
                    to="/leaderboard"
                    className={mobileLinkClasses('/leaderboard')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Leaderboard
                  </Link>
                  <Link
                    to="/pong"
                    className={mobileLinkClasses('/pong')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🏓 Pong
                  </Link>

                  <div className="border-t border-muted pt-2 mt-2">
                    <div className="flex items-center space-x-3 px-4 py-3">
                      <span className="font-medium">{user.name}</span>
                      <div
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold ${getMuskBucksColorClasses(user.muskBucks)}`}
                      >
                        <span>{formatMuskBucks(user.muskBucks)}</span>
                        <span>🪙</span>
                      </div>
                    </div>

                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        className={mobileLinkClasses('/admin')}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}

                    <Link
                      to={`/profile/${user.id}`}
                      className={mobileLinkClasses(`/profile/${user.id}`)}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>

                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-error hover:text-white transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-4 py-3 text-tertiary">Loading...</div>
              )
            ) : (
              <>
                <Link
                  to="/public"
                  className={mobileLinkClasses('/public')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/public/predictions"
                  className={mobileLinkClasses('/public/predictions')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Predictions
                </Link>
                <Link
                  to="/public/leaderboard"
                  className={mobileLinkClasses('/public/leaderboard')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Leaderboard
                </Link>
                <Link
                  to="/public/timeline"
                  className={mobileLinkClasses('/public/timeline')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Timeline
                </Link>
                <div className="border-t border-muted pt-2 mt-2">
                  <Link
                    to="/login"
                    className={mobileLinkClasses('/login')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className={mobileLinkClasses('/register')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
