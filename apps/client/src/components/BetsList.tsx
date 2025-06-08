import { useState } from 'react';
import type { Bet } from '../api/predictions';

interface BetsListProps {
  bets: Bet[];
}

export default function BetsList({ bets }: BetsListProps) {
  const [expanded, setExpanded] = useState(false);

  // Show either all or just the first two
  const shownBets = expanded ? bets : bets.slice(0, 2);

  if (bets.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium mb-2">Bets</h3>
      <ul className="space-y-2 text-sm">
        {shownBets.map((b) => (
          <li
            key={b.id}
            className="flex justify-between bg-background border border-muted rounded-lg px-3 py-2 shadow-sm"
          >
            <span>
              <strong>{b.user.name}</strong> bet <em>{b.amount}</em> on{' '}
              <strong className={b.option === 'YES' ? 'text-green-600' : 'text-red-600'}>
                {b.option}
              </strong>
            </span>
            {/* Optional timestamp */}
            {'createdAt' in b && (
              <span className="text-xs text-gray-500">
                {new Date((b as any).createdAt).toLocaleTimeString()}
              </span>
            )}
          </li>
        ))}
      </ul>

      {bets.length > 2 && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="
              text-blue-500 hover:text-blue-600 text-sm font-medium transition
            "
          >
            {expanded ? 'Show fewer bets' : `View all ${bets.length} bets`}
          </button>
        </div>
      )}
    </div>
  );
}