import { useState, useCallback } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import type { UserStatsDTO, PublicUser } from '@ems/types';

export default function UserStats() {
  const { users, statsFor, loadUserStats } = useAdmin();
  const [loadingAll, setLoadingAll] = useState(false);

  const handleLoadAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      await Promise.all(users.map((u) => loadUserStats(u.id)));
    } finally {
      setLoadingAll(false);
    }
  }, [users, loadUserStats]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Stats</h2>
        <button
          onClick={handleLoadAll}
          disabled={loadingAll}
          className="px-3 py-1 bg-accent hover:bg-accent-dark text-surface rounded transition"
        >
          {loadingAll ? 'Loading…' : 'Load All'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-muted text-sm uppercase">
              <th className="px-2 py-1">User</th>
              <th className="px-2 py-1">Total Bets</th>
              <th className="px-2 py-1">Wins</th>
              <th className="px-2 py-1">Losses</th>
              <th className="px-2 py-1">Total Parlays</th>
              <th className="px-2 py-1">Parlays Won</th>
              <th className="px-2 py-1">Parlays Lost</th>
              <th className="px-2 py-1">Parlay Legs Won</th>
              <th className="px-2 py-1">Parlay Legs Lost</th>
              <th className="px-2 py-1">Wagered</th>
              <th className="px-2 py-1">Won</th>
              <th className="px-2 py-1">Biggest Win</th>
              <th className="px-2 py-1">Common Bet</th>
              <th className="px-2 py-1">Current Streak</th>
              <th className="px-2 py-1">Longest Streak</th>
              <th className="px-2 py-1">Profit</th>
              <th className="px-2 py-1">ROI</th>
              <th className="px-2 py-1">Last Updated</th>
              <th className="px-2 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: PublicUser) => {
              const s: UserStatsDTO | null = statsFor[u.id] ?? null;
              return (
                <tr
                  key={u.id}
                  className="even:bg-surface odd:bg-background hover:bg-surface transition"
                >
                  <td className="px-2 py-1">{u.name}</td>
                  {s ? (
                    <>
                      <td className="px-2 py-1">{s.totalBets}</td>
                      <td className="px-2 py-1">{s.betsWon}</td>
                      <td className="px-2 py-1">{s.betsLost}</td>
                      <td className="px-2 py-1">{s.totalParlays}</td>
                      <td className="px-2 py-1">{s.parlaysWon}</td>
                      <td className="px-2 py-1">{s.parlaysLost}</td>
                      <td className="px-2 py-1">{s.parlayLegsWon}</td>
                      <td className="px-2 py-1">{s.parlayLegsLost}</td>
                      <td className="px-2 py-1">{s.totalWagered}</td>
                      <td className="px-2 py-1">{s.totalWon}</td>
                      <td className="px-2 py-1">{s.biggestWin}</td>
                      <td className="px-2 py-1">{s.mostCommonBet ?? '-'}</td>
                      <td className="px-2 py-1">{s.currentStreak}</td>
                      <td className="px-2 py-1">{s.longestStreak}</td>
                      <td className="px-2 py-1">{s.profit}</td>
                      <td className="px-2 py-1">{(s.roi * 100).toFixed(1)}%</td>
                      <td className="px-2 py-1">{new Date(s.updatedAt).toLocaleString()}</td>
                      <td className="px-2 py-1">
                        <button
                          onClick={() => loadUserStats(u.id)}
                          className="px-2 py-0.5 bg-primary text-surface rounded hover:opacity-90 transition"
                        >
                          Refresh
                        </button>
                      </td>
                    </>
                  ) : (
                    <td className="px-2 py-1 text-center" colSpan={20}>
                      <button
                        onClick={() => loadUserStats(u.id)}
                        className="px-2 py-0.5 bg-tertiary text-surface rounded hover:opacity-90 transition"
                      >
                        Load
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
