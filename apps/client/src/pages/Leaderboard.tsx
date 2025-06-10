import { useApi } from '../hooks/useApi';
import { getLeaderboard } from '../api/predictions';
import type { LeaderboardEntry } from '../api/predictions';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const { data, loading, error } = useApi<LeaderboardEntry[]>(
    () => getLeaderboard(),
    [], // initial data
  );

  if (loading) {
    return <p className="p-4 text-center">Loading leaderboard…</p>;
  }
  if (error) {
    return <p className="p-4 text-center text-red-500">Error: {error.toString()}</p>;
  }
  // If data is null or not an array
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="p-4 text-center">No leaderboard entries yet.</p>;
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-surface rounded-2xl shadow-lg">
      <h1 className="text-4xl font-extrabold mb-6 text-center">🏆 Leaderboard</h1>
      <div className="space-y-3">
        {data.map((entry, idx) => (
          <Link
            key={entry.id}
            to={`/profile/${entry.id}`}
            className="flex justify-between items-center p-3 bg-background rounded-xl shadow-sm cursor-pointer hover:bg-surface hover:shadow-lg transition"
          >
            <span className="font-medium">
              {idx + 1}. {entry.name}
            </span>
            <span className="text-lg font-bold">{entry.muskBucks} 🪙</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
