import { useApi } from '../hooks/useApi';
import { getLeaderboard} from '../api/predictions';
import type { LeaderboardEntry } from '../api/predictions';

export default function Leaderboard() {
  const { data, loading, error, refresh } = useApi<LeaderboardEntry[]>(
    () => getLeaderboard(),
    []
  );

  if (loading) return <p className="p-4">Loading leaderboard...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error.toString()}</p>;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-4">Leaderboard</h1>
      <button
        onClick={refresh}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Refresh
      </button>
      <ol className="list-decimal list-inside space-y-2">
        {data?.map((entry) => (
          <li key={entry.id} className="flex justify-between">
            <span>{entry.name}</span>
            <span>{entry.muskBucks} MuskBucks</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
