// apps/client/src/pages/Predictions.tsx
import { useState, useMemo } from 'react';
import type { PredictionFull, BetWithUser } from '../api/predictions';
import type { PublicPredictionOption, PublicParlayLeg } from '@ems/types';
import BetForm from '../components/BetForm';
import CreatePredictionForm from '../components/CreatePredictionForm';
import { usePredictions } from '../hooks/usePredictions';
import { useAuth } from '../contexts/AuthContext';
import ResolvePrediction from '../components/ResolvePrediction';
import OddsBar from '../components/OddsBar';
import BetsList from '../components/BetsList';
import { useParlay } from '../contexts/ParlayContext';

// Local helper type matching what BetsList now expects:
interface FlattenedParlayLeg {
  parlayId: number;
  user: { id: number; name: string };
  stake: number;
  optionId: number;
  createdAt: string;
}

interface PredictionWithPools extends PredictionFull {
  bets: BetWithUser[];
  pools: Array<{ label: string; pct: number }>;
}

export default function Predictions() {
  const { predictions: raw, loading, error, refresh } = usePredictions();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { dispatch } = useParlay();
  const [creating, setCreating] = useState(false);
  const [selOptions, setSelOptions] = useState<Record<number, number>>({});

  // build percentage pools per prediction
  const predictions = useMemo<PredictionWithPools[]>(() => {
    return raw.map((pred) => {
      const bets = pred.bets as BetWithUser[];
      const total = bets.reduce((sum, b) => sum + b.amount, 0);

      const pools = (pred.options as PublicPredictionOption[]).slice(0, 4).map((opt) => {
        const optSum = bets.filter((b) => b.optionId === opt.id).reduce((s, b) => s + b.amount, 0);
        return { label: opt.label, pct: total > 0 ? optSum / total : 0 };
      });

      return { ...pred, bets, pools };
    });
  }, [raw]);

  if (loading) return <p className="p-4 text-center">Loading predictions…</p>;
  if (error) return <p className="p-4 text-center text-red-500">Error: {String(error)}</p>;
  if (!predictions.length) return <p className="p-4 text-center">No predictions available.</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-background rounded-lg">
      {/* Make Prediction */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setCreating((c) => !c)}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-lg font-bold rounded-full shadow-xl transform hover:scale-105 transition"
        >
          {creating ? 'Cancel Prediction' : 'Make Prediction'}
        </button>
      </div>
      {creating && (
        <div className="mb-6">
          <CreatePredictionForm onCreated={() => setCreating(false)} />
        </div>
      )}

      <ul className="space-y-6">
        {predictions.map((pred) => {
          const now = Date.now();
          const expires = new Date(pred.expiresAt).getTime();
          const [badgeColor, badgeText] = pred.resolved
            ? ['bg-gray-400', 'Resolved']
            : now > expires
              ? ['bg-red-500', 'Expired']
              : ['bg-blue-500', 'Open'];

          // selected option for Add to Parlay
          const defaultOpt = pred.options[0]?.id;
          const sel = selOptions[pred.id] ?? defaultOpt;

          // **Flatten** the nested PublicParlayLeg[]
          const flatParlays: FlattenedParlayLeg[] = (
            (pred as any).options as PublicPredictionOption & { parlayLegs?: PublicParlayLeg[] }[]
          ).flatMap((opt) =>
            (opt.parlayLegs ?? []).map((leg) => ({
              parlayId: leg.parlayId,
              user: leg.parlay.user,
              stake: leg.parlay.amount,
              optionId: leg.optionId,
              createdAt: leg.createdAt,
            })),
          );

          return (
            <li
              key={pred.id}
              className="relative bg-surface border border-muted p-6 rounded-2xl shadow hover:shadow-lg transition"
            >
              {/* Status badge */}
              <span
                className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${badgeColor} text-white`}
              >
                {badgeText}
              </span>

              {/* Title & Description */}
              <h2 className="text-2xl font-semibold mb-2">{pred.title}</h2>
              <p className="mb-3 text-base">{pred.description}</p>

              {/* Expires info */}
              {!pred.resolved && (
                <p
                  className={`text-sm font-medium mb-4 ${
                    now > expires ? 'text-red-600' : 'text-green-500'
                  }`}
                >
                  {now > expires
                    ? `Expired at: ${new Date(pred.expiresAt).toLocaleString()}`
                    : `Expires at: ${new Date(pred.expiresAt).toLocaleString()}`}
                </p>
              )}

              {/* Odds bar */}
              <OddsBar
                options={pred.options as PublicPredictionOption[]}
                bets={pred.bets}
                parlayLegs={flatParlays}
              />

              {/* Activity: single bets + parlay legs */}
              {(pred.bets.length > 0 || flatParlays.length > 0) && (
                <BetsList
                  bets={pred.bets}
                  parlayLegs={flatParlays}
                  options={pred.options as PublicPredictionOption[]}
                />
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3 items-center">
                {!pred.resolved && (
                  <>
                    <BetForm prediction={pred} onPlaced={refresh} />

                    <select
                      value={sel}
                      onChange={(e) =>
                        setSelOptions((prev) => ({
                          ...prev,
                          [pred.id]: Number(e.target.value),
                        }))
                      }
                      className="border p-2 rounded"
                    >
                      {pred.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        dispatch({
                          type: 'ADD_LEG',
                          leg: { predictionId: pred.id, optionId: sel! },
                        })
                      }
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow transition"
                    >
                      Add to Parlay
                    </button>
                  </>
                )}
                {isAdmin && !pred.resolved && (
                  <ResolvePrediction predictionId={pred.id} onResolved={refresh} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
