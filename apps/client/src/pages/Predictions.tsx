// apps/client/src/pages/Predictions.tsx
import { useState, useMemo } from 'react';
import type { PredictionFull, BetWithUser } from '../api/predictions';
import type { PublicPredictionOption } from '@ems/types';
import BetForm from '../components/BetForm';
import CreatePredictionForm from '../components/CreatePredictionForm';
import { usePredictions } from '../hooks/usePredictions';
import { useAuth } from '../contexts/AuthContext';
import OddsBar from '../components/OddsBar';
import BetsList from '../components/BetsList';
import { useParlay } from '../contexts/ParlayContext';

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
  const { dispatch } = useParlay();
  const [creating, setCreating] = useState(false);
  const [selOptions, setSelOptions] = useState<Record<number, number>>({});
  const [tab, setTab] = useState<'ALL' | 'PENDING'>('ALL');

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

  // filter by tab
  const filtered = useMemo(
    () => predictions.filter((pred) => (tab === 'ALL' ? pred.approved : !pred.approved)),
    [predictions, tab],
  );

  if (loading) return <p className="p-4 text-center">Loading predictions…</p>;
  if (error) return <p className="p-4 text-center text-red-500">Error: {String(error)}</p>;

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

      {/* Tabs */}
      <div className="flex justify-center mb-6 space-x-4">
        <button
          className={`px-4 py-2 rounded ${
            tab === 'ALL' ? 'bg-blue-600 text-white' : 'bg-surface text-gray-700'
          }`}
          onClick={() => setTab('ALL')}
        >
          All Predictions
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tab === 'PENDING' ? 'bg-blue-600 text-white' : 'bg-surface text-gray-700'
          }`}
          onClick={() => setTab('PENDING')}
        >
          Pending Approval
        </button>
      </div>

      {/* Empty state */}
      {!filtered.length && (
        <p className="p-4 text-center">
          {tab === 'ALL' ? 'No predictions available.' : 'No pending predictions.'}
        </p>
      )}

      <ul className="space-y-6">
        {filtered.map((pred) => {
          const now = Date.now();
          const expires = new Date(pred.expiresAt).getTime();

          // status badge
          let badgeColor: string;
          let badgeText: string;
          if (!pred.approved) {
            badgeColor = 'bg-yellow-500';
            badgeText = 'Pending';
          } else if (pred.resolved) {
            badgeColor = 'bg-gray-400';
            badgeText = 'Resolved';
          } else if (now > expires) {
            badgeColor = 'bg-red-500';
            badgeText = 'Expired';
          } else {
            badgeColor = 'bg-blue-500';
            badgeText = 'Open';
          }

          // selected option for Add to Parlay
          const defaultOpt = pred.options[0]?.id;
          const sel = selOptions[pred.id] ?? defaultOpt;

          // flatten parlay legs
          // Use the service‐flattened parlayLegs directly
          const flatParlays: FlattenedParlayLeg[] = pred.parlayLegs.map((leg) => ({
            parlayId: leg.parlayId,
            user: leg.user, // already { id, name }
            stake: leg.stake, // already the numeric stake
            optionId: leg.optionId,
            createdAt: leg.createdAt,
          }));

          return (
            <li
              key={pred.id}
              className="relative bg-surface border border-muted p-6 rounded-2xl shadow hover:shadow-lg transition"
            >
              <span
                className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${badgeColor} text-white`}
              >
                {badgeText}
              </span>

              <h2 className="text-2xl font-semibold mb-2">{pred.title}</h2>
              <p className="mb-3 text-base">{pred.description}</p>

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

              <OddsBar
                type={pred.type}
                options={pred.options as PublicPredictionOption[]}
                bets={pred.bets}
                parlayLegs={flatParlays}
              />

              {(pred.bets.length > 0 || flatParlays.length > 0) && (
                <BetsList
                  type={pred.type}
                  bets={pred.bets}
                  parlayLegs={flatParlays}
                  options={pred.options as PublicPredictionOption[]}
                />
              )}

              <div className="mt-6 flex flex-wrap gap-3 items-center">
                {pred.approved && !pred.resolved && (
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

                {!pred.approved && (
                  <p className="text-sm italic text-yellow-700">
                    {pred.creatorId === user?.id
                      ? 'Your prediction is awaiting admin approval.'
                      : 'This prediction is awaiting admin approval.'}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
