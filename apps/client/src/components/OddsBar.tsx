// apps/client/src/components/OddsBar.tsx
import type { PublicPredictionOption, PublicBet } from '@ems/types';
import { PredictionType } from '@ems/types';

// match your flattened shape
interface FlattenedParlayLeg {
  parlayId: number;
  user: { id: number; name: string };
  stake: number;
  optionId: number;
  createdAt: string;
}

interface OddsBarProps {
  type: PredictionType;
  options: PublicPredictionOption[];
  bets?: PublicBet[];
  parlayLegs?: FlattenedParlayLeg[];
}

export default function OddsBar({ type, options, bets = [], parlayLegs = [] }: OddsBarProps) {
  // define three palettes
  const palettes: Record<PredictionType, string[]> = {
    [PredictionType.BINARY]: ['bg-green-500', 'bg-red-500'],
    [PredictionType.OVER_UNDER]: ['bg-purple-500', 'bg-indigo-500'],
    [PredictionType.MULTIPLE]: ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'],
  };

  // pick the right palette (or fall back to multiple)
  const palette = palettes[type] ?? palettes[PredictionType.MULTIPLE];

  // compute total staked
  const totalStaked =
    bets.reduce((sum, b) => sum + b.amount, 0) + parlayLegs.reduce((sum, l) => sum + l.stake, 0);

  if (totalStaked === 0 || options.length === 0) {
    return <p className="mt-3 text-sm italic text-gray-500">No bets placed!</p>;
  }

  // build the slices
  let cumPct = 0;
  const pools = options.slice(0, palette.length).map((opt, i) => {
    const singles = bets.filter((b) => b.optionId === opt.id).reduce((s, b) => s + b.amount, 0);
    const parlays = parlayLegs
      .filter((l) => l.optionId === opt.id)
      .reduce((s, l) => s + l.stake, 0);
    const stake = singles + parlays;
    const pct = stake / totalStaked;
    const left = cumPct;
    cumPct += pct;
    return { label: opt.label, pct, left, color: palette[i] };
  });

  return (
    <div className="mt-3">
      {/* bar */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        {pools.map((p) => (
          <div
            key={p.label}
            className={`absolute top-0 h-full ${p.color}`}
            style={{ left: `${p.left * 100}%`, width: `${p.pct * 100}%` }}
          />
        ))}
      </div>

      {/* legend */}
      <div className="flex flex-wrap mt-2 text-sm space-x-4">
        {pools.map((p) => (
          <div key={p.label} className="flex items-center space-x-1">
            <span className={`inline-block w-3 h-3 ${p.color} rounded-full`} />
            <span>
              {p.label} {(p.pct * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
