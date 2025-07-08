// apps/client/src/pages/Leaderboard.tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLeaderboard } from '../hooks/useLeaderboard';
import type { LeaderboardPeriod } from '../hooks/useLeaderboard';

export default function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const { data, loading, error } = useLeaderboard(period, 25);
  const leaderboard = useMemo(() => data, [data]);

  if (loading) return <p className="p-4 text-center text-tertiary">Loading leaderboard…</p>;
  if (error) return <p className="p-4 text-center text-red-500">Error: {error.message}</p>;
  if (!leaderboard?.length)
    return <p className="p-4 text-center text-tertiary">No leaderboard entries yet.</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-4xl font-extrabold text-center text-primary">🏆 Leaderboard</h1>

      {/* Period Tabs */}
      <div className="flex justify-center space-x-4 mb-4">
        {(['all-time', 'daily'] as LeaderboardPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full font-medium transition ${
              period === p ? 'bg-secondary text-surface' : 'bg-muted text-content hover:bg-accent'
            }`}
          >
            {p === 'all-time' ? 'All-Time' : 'Daily'}
          </button>
        ))}
      </div>

      {/* Entries */}
      <ul className="space-y-4">
        {leaderboard!.map((entry, idx) => {
          const change = entry.rankChange ?? 0;
          const changeColor =
            change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-tertiary';
          const changeSymbol = change > 0 ? '▲' : change < 0 ? '▼' : '–';

          return (
            <li
              key={entry.userId}
              className="bg-surface rounded-xl shadow-sm hover:shadow-md transition"
            >
              <Link
                to={`/profile/${entry.userId}`}
                className="block md:flex items-center p-4 space-y-4 md:space-y-0 md:space-x-6"
              >
                {/* Rank & Avatar */}
                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <span className="text-2xl font-bold w-8 text-center">{idx + 1}</span>
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={`${entry.userName}’s avatar`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-muted"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-tertiary border-2 border-muted" />
                  )}
                  <span className="font-semibold text-lg">{entry.userName}</span>
                  <span className={`ml-auto font-medium ${changeColor} text-sm`}>
                    {changeSymbol} {Math.abs(change)}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  <Stat label="Balance" value={`${entry.balance} 🪙`} />
                  <Stat label="Bets" value={`${entry.totalBets}`} />
                  <Stat label="Win Rate" value={`${(entry.winRate * 100).toFixed(1)}%`} />
                  <Stat
                    label={period === 'all-time' ? 'All-Time Profit' : 'Daily Profit'}
                    value={`${period === 'all-time' ? entry.profitAll : entry.profitPeriod} 🏦`}
                  />
                  <Stat label="ROI" value={`${(entry.roi * 100).toFixed(1)}%`} />
                  <Stat label="Longest Streak" value={`${entry.longestStreak}`} />
                  <Stat label="Current Streak" value={`${entry.currentStreak}`} />
                  <Stat
                    label="Parlays (W/S)"
                    value={`${entry.parlaysWon}/${entry.parlaysStarted}`}
                  />
                  <Stat
                    label="Parlay Legs (W/T)"
                    value={`${entry.parlayLegsWon}/${entry.totalParlayLegs}`}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 text-center">
      <div className="text-xs text-tertiary uppercase">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
