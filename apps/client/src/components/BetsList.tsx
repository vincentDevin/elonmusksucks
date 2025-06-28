// apps/client/src/components/BetsList.tsx
import { useState } from 'react';
import type { PublicBet } from '@ems/types';

interface BetsListProps {
  bets: Array<PublicBet & { user: { id: number; name: string } }>;
}

export default function BetsList({ bets }: BetsListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!bets || bets.length === 0) {
    return null;
  }

  // Show either all or just the first two
  const shownBets = expanded ? bets : bets.slice(0, 2);

  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium mb-2">Bets</h3>
      <ul className="space-y-2 text-sm">
        {shownBets.map((b) => {
          const label = b.optionId === 1 ? 'YES' : 'NO';
          const colorClass = label === 'YES' ? 'text-green-600' : 'text-red-600';
          return (
            <li
              key={b.id}
              className="flex justify-between bg-background border border-muted rounded-lg px-3 py-2 shadow-sm"
            >
              <span>
                <strong>{b.user.name}</strong> bet <em>{b.amount}</em> on{' '}
                <strong className={colorClass}>{label}</strong>
              </span>
              <span className="text-xs text-gray-500">
                {new Date(b.createdAt).toLocaleTimeString()}
              </span>
            </li>
          );
        })}
      </ul>

      {bets.length > 2 && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-blue-500 hover:text-blue-600 text-sm font-medium transition"
          >
            {expanded ? 'Show fewer bets' : `View all ${bets.length} bets`}
          </button>
        </div>
      )}
    </div>
  );
}
