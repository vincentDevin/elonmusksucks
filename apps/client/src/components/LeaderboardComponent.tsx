import { useApi } from '../hooks/useApi';
import { getLeaderboard } from '../api/predictions';
import type { LeaderboardEntry } from '../api/predictions';

export function LeaderboardComponent() {
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
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="p-4 text-center">No leaderboard entries yet.</p>;
  }

  return (
    <div className="p-6 bg-surface rounded-2xl shadow-lg">
      <h2 className="text-3xl font-extrabold mb-4 text-center">🏆 Leaderboard</h2>
      <div className="space-y-2">
        {data.map((entry, idx) => (
          <div
            key={entry.id}
            className="flex justify-between items-center p-3 bg-background rounded-lg hover:bg-surface transition"
          >
            <span className="font-medium">
              {idx + 1}. {entry.name}
            </span>
            <span className="text-lg font-bold">{entry.muskBucks} 🪙</span>
          </div>
        ))}
      </div>
    </div>
  );
}
