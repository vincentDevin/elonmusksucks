import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <nav className="mb-6 space-x-4">
        <Link to="/predictions" className="text-blue-600 hover:underline">
          Predictions
        </Link>
        <Link to="/leaderboard" className="text-blue-600 hover:underline">
          Leaderboard
        </Link>
      </nav>
      <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded">
        Logout
      </button>
    </div>
  );
}
