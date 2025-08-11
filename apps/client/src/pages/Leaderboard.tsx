// apps/client/src/pages/Leaderboard.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLeaderboard } from '../hooks/useLeaderboard';
import type { LeaderboardPeriod } from '../hooks/useLeaderboard';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { getShameWall, getShameWallStats } from '../api/shameWall';
import type { ShameWallEntry, ShameWallStats } from '../api/shameWall';

type TabType = 'leaderboard' | 'shame-wall';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const { data: leaderboard, loading, error } = useLeaderboard(period, 25);

  // Shame Wall state
  const [shameWall, setShameWall] = useState<ShameWallEntry[]>([]);
  const [shameWallStats, setShameWallStats] = useState<ShameWallStats | null>(null);
  const [shameWallLoading, setShameWallLoading] = useState(false);
  const [shameWallError, setShameWallError] = useState<string | null>(null);

  // Fetch shame wall data when tab is selected
  useEffect(() => {
    if (activeTab === 'shame-wall') {
      const fetchShameWall = async () => {
        setShameWallLoading(true);
        setShameWallError(null);
        try {
          const [wallData, statsData] = await Promise.all([getShameWall(), getShameWallStats()]);
          setShameWall(wallData);
          setShameWallStats(statsData);
        } catch (err) {
          setShameWallError(err instanceof Error ? err.message : 'Failed to load shame wall');
        } finally {
          setShameWallLoading(false);
        }
      };

      fetchShameWall();
    }
  }, [activeTab]);

  // Loading states
  const isLoading = activeTab === 'leaderboard' ? loading : shameWallLoading;
  const hasError = activeTab === 'leaderboard' ? error : shameWallError;
  const isEmpty = activeTab === 'leaderboard' ? !leaderboard.length : !shameWall.length;

  if (isLoading) {
    return (
      <p className="p-4 text-center text-tertiary">
        Loading {activeTab === 'leaderboard' ? 'leaderboard' : 'shame wall'}…
      </p>
    );
  }
  if (hasError) {
    return (
      <p className="p-4 text-center text-red-500">
        Error: {hasError instanceof Error ? hasError.message : hasError}
      </p>
    );
  }

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
        {leaderboard.map((entry, idx) => {
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
                    <span className="w-12 h-12 flex items-center justify-center rounded-full bg-tertiary border-2 border-muted text-tertiary">
                      <UserCircleIcon className="w-10 h-10 text-gray-400" aria-hidden="true" />
                    </span>
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
