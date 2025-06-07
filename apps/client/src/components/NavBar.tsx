import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { useThemeContext } from '../contexts/ThemeContext';

export default function NavBar() {
  const { accessToken, logout } = useAuth();
  const { theme, toggleTheme } = useThemeContext();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClasses = (path: string) =>
    `px-3 py-2 rounded ${
      loc.pathname === path
        ? 'bg-blue-600 text-white'
        : 'hover:bg-muted'
    }`;

  return (
    <header className="border-b border-muted">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link to="/" className="text-xl font-bold">
          🚀 ElonMuskSucks
        </Link>

        <nav className="flex items-center space-x-2">
          {accessToken ? (
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
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded hover:bg-red-600 hover:text-white"
              >
                Logout
              </button>
            </>
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
            aria-label={
              theme === 'light' ? 'Activate dark mode' : 'Activate light mode'
            }
            aria-pressed={theme === 'dark'}
            title={
              theme === 'light'
                ? 'Switch to dark mode'
                : 'Switch to light mode'
            }
            className="ml-4 flex items-center space-x-1 p-2 rounded hover:bg-muted"
          >
            <span className="text-lg">
              {theme === 'light' ? <FaMoon /> : <FaSun />}
            </span>
            <span className="sr-only">
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}