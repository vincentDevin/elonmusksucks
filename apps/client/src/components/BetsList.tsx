import { useState } from 'react';
import type { PublicBet, PublicPredictionOption } from '@ems/types';

interface BetWithUser extends PublicBet {
  user: { id: number; name: string };
}

// matches what your service flattens into `pred.parlayLegs`
interface FlattenedParlayLeg {
  parlayId: number;
  user: { id: number; name: string };
  stake: number;
  optionId: number;
  createdAt: string;
}

interface BetsListProps {
  bets: BetWithUser[];
  parlayLegs?: FlattenedParlayLeg[];
  options: PublicPredictionOption[];
}

export default function BetsList({ bets, parlayLegs = [], options }: BetsListProps) {
  const [expanded, setExpanded] = useState(false);

  // combine single bets and parquet legs into one timeline
  const combined: Array<
    { type: 'bet'; data: BetWithUser } | { type: 'parlay'; data: FlattenedParlayLeg }
  > = [
    ...bets.map((b) => ({ type: 'bet' as const, data: b })),
    ...parlayLegs.map((l) => ({ type: 'parlay' as const, data: l })),
  ];

  if (!combined.length) return null;

  const shown = expanded ? combined : combined.slice(0, 3);

  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium mb-2">Activity</h3>
      <ul className="space-y-2 text-sm">
        {shown.map((item) => {
          if (item.type === 'bet') {
            const b = item.data;
            const opt = options.find((o) => o.id === b.optionId);
            const label = opt?.label ?? 'Unknown';
            return (
              <li
                key={`bet-${b.id}`}
                className="flex justify-between bg-background border border-muted rounded-lg px-3 py-2 shadow-sm"
              >
                <span>
                  <strong>{b.user.name}</strong> bet <em>{b.amount}</em> on{' '}
                  <strong className="text-indigo-600">{label}</strong>
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(b.createdAt).toLocaleTimeString()}
                </span>
              </li>
            );
          } else {
            const l = item.data;
            const opt = options.find((o) => o.id === l.optionId);
            const label = opt?.label ?? 'Unknown';
            return (
              <li
                key={`parlay-${l.parlayId}-${l.optionId}`}
                className="flex justify-between bg-background border border-muted rounded-lg px-3 py-2 shadow-sm italic"
              >
                <span>
                  <strong>{l.user.name}</strong> parlayed <em>{l.stake}</em> on{' '}
                  <strong className="text-indigo-600">{label}</strong>
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(l.createdAt).toLocaleTimeString()}
                </span>
              </li>
            );
          }
        })}
      </ul>
      {combined.length > 3 && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-blue-500 hover:text-blue-600 text-sm font-medium transition"
          >
            {expanded ? 'Show fewer' : `View all ${combined.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
