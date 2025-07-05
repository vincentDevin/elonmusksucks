import React from 'react';
import { useAdmin } from '../../contexts/AdminContext';

const UserStats: React.FC = () => {
  const { users, statsFor, loadUserStats } = useAdmin();

  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">User Stats</h2>
      <ul className="space-y-1">
        {users.map((u) => {
          const s = statsFor[u.id];
          return (
            <li key={u.id} className="flex justify-between">
              <span>{u.name}</span>
              {s ? (
                <span>
                  Bets: {s.totalBets}, Wins: {s.betsWon}, Profit: {s.profit}
                </span>
              ) : (
                <button
                  className="px-2 py-0.5 bg-[var(--color-tertiary)] text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                  onClick={() => loadUserStats(u.id)}
                >
                  Load
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default UserStats;
