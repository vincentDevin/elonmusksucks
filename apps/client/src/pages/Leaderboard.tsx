// apps/client/src/pages/Leaderboard.tsx
import { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { getLeaderboard } from '../api/predictions';
import { Link } from 'react-router-dom';
import type { PublicLeaderboardEntry } from '@ems/types';

export default function Leaderboard() {
  const { data, loading, error } = useApi<PublicLeaderboardEntry[]>(
    () => getLeaderboard(),
    [], // initial data
  );

  const leaderboard = useMemo(() => data ?? [], [data]);

  if (loading) {
    return <p className="p-4 text-center">Loading leaderboard…</p>;
  }
  if (error) {
    return <p className="p-4 text-center text-red-500">Error: {error.toString()}</p>;
  }
  if (leaderboard.length === 0) {
    return <p className="p-4 text-center">No leaderboard entries yet.</p>;
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-surface rounded-2xl shadow-lg">
      <h1 className="text-4xl font-extrabold mb-6 text-center">🏆 Leaderboard</h1>
      <div className="space-y-3">
        {leaderboard.map((entry, idx) => (
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
