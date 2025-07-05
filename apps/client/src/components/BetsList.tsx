// apps/client/src/components/BetsList.tsx
import { useState } from 'react';
import type {
  PublicBet,
  PublicPredictionOption,
} from '@ems/types';
import { PredictionType } from '@ems/types';

interface BetWithUser extends PublicBet {
  user: { id: number; name: string };
}

interface FlattenedParlayLeg {
  parlayId: number;
  user: { id: number; name: string };
  stake: number;
  optionId: number;
  createdAt: string;
}

interface BetsListProps {
  type: PredictionType;
  bets: BetWithUser[];
  parlayLegs?: FlattenedParlayLeg[];
  options: PublicPredictionOption[];
}

const PALETTES: Record<PredictionType, string[]> = {
  [PredictionType.BINARY]: ['bg-green-500', 'bg-red-500'],
  [PredictionType.OVER_UNDER]: ['bg-purple-500', 'bg-indigo-500'],
  [PredictionType.MULTIPLE]: [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
  ],
};

export default function BetsList({
  type,
  bets,
  parlayLegs = [],
  options,
}: BetsListProps) {
  const [expanded, setExpanded] = useState(false);

  // Combine bets + parlays into one timeline
  const combined: Array<
    | { kind: 'bet'; data: BetWithUser }
    | { kind: 'parlay'; data: FlattenedParlayLeg }
  > = [
    ...bets.map((b) => ({ kind: 'bet' as const, data: b })),
    ...parlayLegs.map((l) => ({ kind: 'parlay' as const, data: l })),
  ];

  if (combined.length === 0) return null;
  const shown = expanded ? combined : combined.slice(0, 3);

  // pick palette for this prediction type
  const bgPalette = PALETTES[type] ?? PALETTES[PredictionType.MULTIPLE];
  const textPalette = bgPalette.map((cls) =>
    cls.replace(/^bg-/, 'text-')
  );

  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium mb-2">Activity</h3>
      <ul className="space-y-2 text-sm">
        {shown.map((item) => {
          // determine option index & color
          const optId =
            item.kind === 'bet'
              ? item.data.optionId
              : item.data.optionId;
          const optIndex = options.findIndex((o) => o.id === optId);
          const colorClass =
            textPalette[optIndex] ?? textPalette[0];

          if (item.kind === 'bet') {
            const b = item.data;
            const label =
              options.find((o) => o.id === b.optionId)?.label ??
              'Unknown';
            return (
              <li
                key={`bet-${b.id}`}
                className="flex justify-between bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg px-3 py-2 shadow-sm"
              >
                <span>
                  <strong>{b.user.name}</strong> bet{' '}
                  <em>{b.amount}</em> on{' '}
                  <strong className={colorClass}>{label}</strong>
                </span>
                <span className="text-xs text-[var(--color-tertiary)]">
                  {new Date(b.createdAt).toLocaleTimeString()}
                </span>
              </li>
            );
          } else {
            const l = item.data;
            const label =
              options.find((o) => o.id === l.optionId)?.label ??
              'Unknown';
            return (
              <li
                key={`parlay-${l.parlayId}-${l.optionId}`}
                className="flex justify-between bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg px-3 py-2 shadow-sm italic"
              >
                <span>
                  <strong>{l.user.name}</strong> parlayed{' '}
                  <em>{l.stake}</em> on{' '}
                  <strong className={colorClass}>{label}</strong>
                </span>
                <span className="text-xs text-[var(--color-tertiary)]">
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
            className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] text-sm font-medium transition"
          >
            {expanded ? 'Show fewer' : `View all ${combined.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
