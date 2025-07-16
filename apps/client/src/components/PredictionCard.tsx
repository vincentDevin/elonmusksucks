// apps/client/src/components/dashboard/PredictionCard.tsx
import { useState } from 'react';
import type {
  PublicPredictionOption,
  BetWithUser,
  ParlayLegWithUser,
  PredictionType,
} from '@ems/types';
import type { PredictionFull } from '../api/predictions';
import OddsBar from './OddsBar';
import BetsList from './BetsList';
import BetForm from './BetForm';
import { useParlay } from '../contexts/ParlayContext';

/** Slimmed-down card used inside the dashboard predictions feed */
interface Props {
  prediction: PredictionFull;
  /** Optional callback when a bet/parlay leg is placed (for optimistic UI) */
  addOptimisticBet?: (bet: BetWithUser) => void;
}

export default function PredictionCard({ prediction, addOptimisticBet }: Props) {
  const { dispatch: parlayDispatch } = useParlay();
  const [parlaySel, setParlaySel] = useState(
    prediction.options.length ? prediction.options[0].id : 0,
  );

  const flatParlays: ParlayLegWithUser[] = prediction.parlayLegs ?? [];

  const now = Date.now();
  const expires = new Date(prediction.expiresAt).getTime();
  let badgeColor = '';
  let badgeText = '';
  if (prediction.resolved) {
    badgeColor = 'bg-gray-400';
    badgeText = 'Resolved';
  } else if (now > expires) {
    badgeColor = 'bg-red-500';
    badgeText = 'Expired';
  } else {
    badgeColor = 'bg-blue-500';
    badgeText = 'Open';
  }

  return (
    <li className="relative bg-surface border border-muted p-5 rounded-2xl shadow hover:shadow-lg transition">
      <span
        className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium text-white ${badgeColor}`}
      >
        {badgeText}
      </span>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-1">{prediction.title}</h3>

      {/* Mini meta line */}
      {!prediction.resolved && (
        <p
          className={`text-xs font-medium mb-3 ${
            now > expires ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {now > expires
            ? `Expired ${new Date(prediction.expiresAt).toLocaleString()}`
            : `Expires ${new Date(prediction.expiresAt).toLocaleString()}`}
        </p>
      )}

      {/* Odds visual */}
      <OddsBar
        type={prediction.type as PredictionType}
        options={prediction.options as PublicPredictionOption[]}
        bets={prediction.bets}
        parlayLegs={flatParlays}
      />

      {/* Recent bets */}
      {(prediction.bets.length > 0 || flatParlays.length > 0) && (
        <BetsList
          type={prediction.type as PredictionType}
          bets={prediction.bets}
          parlayLegs={flatParlays}
          options={prediction.options as PublicPredictionOption[]}
        />
      )}

      {/* Actions */}
      {!prediction.resolved && (
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          {/* Bet form (collapsible) */}
          <BetForm prediction={prediction} addOptimisticBet={addOptimisticBet ?? (() => {})} />

          {/* Parlay selector */}
          <select
            value={parlaySel}
            onChange={(e) => setParlaySel(Number(e.target.value))}
            className="border border-muted p-2 rounded-lg bg-background"
          >
            {prediction.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              parlayDispatch({
                type: 'ADD_LEG',
                leg: { predictionId: prediction.id, optionId: parlaySel },
              })
            }
            className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium transition"
          >
            Add&nbsp;to&nbsp;Parlay
          </button>
        </div>
      )}
    </li>
  );
}
