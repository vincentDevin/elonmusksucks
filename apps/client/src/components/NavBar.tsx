// apps/client/src/components/NavBar.tsx
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSun, FaMoon, FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { useThemeContext } from '../contexts/ThemeContext';

export default function NavBar() {
  const { accessToken, logout, user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useThemeContext();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClasses = (path: string) =>
    `px-3 py-2 rounded ${
      loc.pathname === path ? 'bg-primary text-surface' : 'hover:bg-muted transition-colors'
    }`;

  const mobileLinkClasses = (path: string) =>
    `block px-4 py-3 rounded-lg ${
      loc.pathname === path ? 'bg-primary text-surface' : 'hover:bg-muted transition-colors'
    }`;

  return (
    <header className="relative z-50 border-b border-muted bg-surface text-content">
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
                <Link to="/predictions" className={linkClasses('/predictions')}>
                  Predictions
                </Link>
                <Link to="/leaderboard" className={linkClasses('/leaderboard')}>
                  Leaderboard
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-3 px-3 py-2 rounded hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{user.name}</span>
                    <div className="flex items-center space-x-1 bg-warning text-surface px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
                      <span>{user.muskBucks.toLocaleString()}</span>
                      <span>🪙</span>
                    </div>
                  </button>
                  {dropdownOpen && (
                    <ul
                      className="
                        absolute right-0 mt-2
                        bg-surface text-content
                        border border-muted rounded shadow
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
                            hover:bg-error hover:text-surface
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
              <Link to="/login" className={linkClasses('/login')}>
                Login
              </Link>
              <Link to="/register" className={linkClasses('/register')}>
                Register
              </Link>
            </>
          )}

          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Activate dark mode' : 'Activate light mode'}
            aria-pressed={theme === 'dark'}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="ml-4 flex items-center space-x-1 p-2 rounded hover:bg-muted transition-colors"
          >
            <span className="text-lg">{theme === 'light' ? <FaMoon /> : <FaSun />}</span>
            <span className="sr-only">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </button>
        </nav>

        {/* Mobile Controls */}
        <div className="md:hidden flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Activate dark mode' : 'Activate light mode'}
            className="p-2 rounded hover:bg-muted transition-colors"
          >
            <span className="text-lg">{theme === 'light' ? <FaMoon /> : <FaSun />}</span>
          </button>
          
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
                  
                  <div className="border-t border-muted pt-2 mt-2">
                    <div className="flex items-center space-x-3 px-4 py-3">
                      <span className="font-medium">{user.name}</span>
                      <div className="flex items-center space-x-1 bg-warning text-surface px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
                        <span>{user.muskBucks.toLocaleString()}</span>
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
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-error hover:text-surface transition-colors"
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
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
