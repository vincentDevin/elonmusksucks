// apps/client/src/components/BetsList.tsx
import { useState } from 'react';
import type { PublicPredictionOption, BetWithUser, ParlayLegWithUser } from '@ems/types';
import { PredictionType } from '@ems/types';

interface BetsListProps {
  type: PredictionType;
  bets: BetWithUser[];
  parlayLegs?: ParlayLegWithUser[];
  options: PublicPredictionOption[];
}

const PALETTES: Record<PredictionType, string[]> = {
  [PredictionType.BINARY]: ['bg-green-500', 'bg-red-500'],
  [PredictionType.OVER_UNDER]: ['bg-purple-500', 'bg-indigo-500'],
  [PredictionType.MULTIPLE]: ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'],
};

const initials = (name?: string | null) =>
  (name ?? 'User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || 'U';

const SafeAvatar = ({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) => {
  const src = avatarUrl && avatarUrl.length > 0 ? avatarUrl : undefined;
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'User'}
        className="inline-block w-7 h-7 rounded-full border border-gray-300"
      />
    );
  }
  // fallback: initials circle
  return (
    <span
      aria-hidden
      className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-gray-200 text-gray-700 text-[10px] font-semibold border border-gray-300"
      title={name ?? 'User'}
    >
      {initials(name)}
    </span>
  );
};

export default function BetsList({ type, bets, parlayLegs = [], options }: BetsListProps) {
  const [expanded, setExpanded] = useState(false);

  // Combine bets + parlays into one timeline
  const combined: Array<
    { kind: 'bet'; data: BetWithUser } | { kind: 'parlay'; data: ParlayLegWithUser }
  > = [
    ...bets.map((b) => ({ kind: 'bet' as const, data: b })),
    ...parlayLegs.map((l) => ({ kind: 'parlay' as const, data: l })),
  ].sort((a, b) => {
    const aDate = new Date(a.data.createdAt).getTime();
    const bDate = new Date(b.data.createdAt).getTime();
    return bDate - aDate;
  });

  if (combined.length === 0) return null;
  const shown = expanded ? combined : combined.slice(0, 3);

  const bgPalette = PALETTES[type] ?? PALETTES[PredictionType.MULTIPLE];
  const textPalette = bgPalette.map((cls) => cls.replace(/^bg-/, 'text-'));

  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium mb-2">Activity</h3>
      <ul className="space-y-2 text-sm">
        {shown.map((item) => {
          const optId = item.data.optionId;
          const optIndex = options.findIndex((o) => o.id === optId);
          const colorClass = textPalette[Math.max(0, optIndex)] ?? textPalette[0];

          if (item.kind === 'bet') {
            const b = item.data;
            const u = b.user ?? null;
            const label = options.find((o) => o.id === b.optionId)?.label ?? 'Unknown';
            return (
              <li
                key={`bet-${b.id}`}
                className="flex justify-between bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg px-3 py-2 shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <SafeAvatar name={u?.name} avatarUrl={u?.avatarUrl as string | null} />
                  <strong>{u?.name ?? 'Anonymous'}</strong> bet <em>{b.amount}</em> on{' '}
                  <strong className={colorClass}>{label}</strong>
                </span>
                <span className="text-xs text-[var(--color-tertiary)]">
                  {new Date(b.createdAt).toLocaleTimeString()}
                </span>
              </li>
            );
          } else {
            const l = item.data;
            const u = l.user ?? null;
            const label = options.find((o) => o.id === l.optionId)?.label ?? 'Unknown';
            return (
              <li
                key={`parlay-${l.parlayId}-${l.optionId}`}
                className="flex justify-between bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg px-3 py-2 shadow-sm italic"
              >
                <span className="flex items-center gap-2">
                  <SafeAvatar name={u?.name} avatarUrl={u?.avatarUrl as string | null} />
                  <strong>{u?.name ?? 'Anonymous'}</strong> parlayed <em>{l.stake}</em> on{' '}
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
