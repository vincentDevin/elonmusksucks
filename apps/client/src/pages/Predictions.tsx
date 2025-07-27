// apps/client/src/pages/Predictions.tsx
// -----------------------------------------------------------------------------
// Main predictions list page (public + pending tab).
// Uses the unified PredictionContext + ParlayContext.
// -----------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import type { PredictionFull } from '../api/predictions';
import type { PublicPredictionOption, BetWithUser, ParlayLegWithUser } from '@ems/types';

import BetForm from '../components/BetForm';
import CreatePredictionForm from '../components/CreatePredictionForm';
import OddsBar from '../components/OddsBar';
import BetsList from '../components/BetsList';

import { usePredictionMarket } from '../contexts/PredictionContext';
import { useParlay } from '../contexts/ParlayContext';
import { useAuth } from '../contexts/AuthContext';

interface PredictionWithPools extends PredictionFull {
  bets: BetWithUser[];
  pools: Array<{ label: string; pct: number }>;
}

export default function Predictions() {
  const { predictions: raw, loading, error, createPrediction } = usePredictionMarket();
  const { user } = useAuth();
  const { dispatch } = useParlay();

  const [creating, setCreating] = useState(false);
  const [parlayOptions, setParlayOptions] = useState<Record<number, number>>({});
  const [tab, setTab] = useState<'OPEN' | 'EXPIRED' | 'RESOLVED' | 'PENDING'>('OPEN');

  /* ---------- Compute pools for each prediction ---------- */
  const predictions = useMemo<PredictionWithPools[]>(() => {
    return raw.map((pred) => {
      const bets = pred.bets as BetWithUser[];
      const total = bets.reduce((sum, b) => sum + b.amount, 0);
      const options = pred.options as PublicPredictionOption[] || [];
      const pools = options.map((opt) => {
        const optSum = bets.filter((b) => b.optionId === opt.id).reduce((s, b) => s + b.amount, 0);
        return { label: opt.label, pct: total > 0 ? optSum / total : 0 };
      });
      return { ...pred, bets, pools };
    });
  }, [raw]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return predictions.filter((p) => {
      const expires = new Date(p.expiresAt).getTime();
      
      switch (tab) {
        case 'PENDING':
          return !p.approved;
        case 'RESOLVED':
          return p.approved && p.resolved;
        case 'EXPIRED':
          return p.approved && !p.resolved && now > expires;
        case 'OPEN':
        default:
          return p.approved && !p.resolved && now <= expires;
      }
    });
  }, [predictions, tab]);

  /* ---------- Render ---------- */
  if (loading) return <p className="p-4 text-center">Loading predictions…</p>;
  if (error) return <p className="p-4 text-center text-red-500">Error: {String(error)}</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-background rounded-lg">
      {/* Create prediction toggle */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setCreating((c) => !c)}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-lg font-bold rounded-full shadow-xl transform hover:scale-105 transition"
        >
          {creating ? 'Cancel Prediction' : 'Make Prediction'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-6">
          <CreatePredictionForm
            onCreated={async (input) => {
              await createPrediction(input);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center mb-6 space-x-2 overflow-x-auto">
        <button
          className={`px-4 py-2 rounded whitespace-nowrap ${
            tab === 'OPEN' ? 'bg-primary text-surface' : 'bg-surface text-content'
          }`}
          onClick={() => setTab('OPEN')}
        >
          Open
        </button>
        <button
          className={`px-4 py-2 rounded whitespace-nowrap ${
            tab === 'EXPIRED' ? 'bg-primary text-surface' : 'bg-surface text-content'
          }`}
          onClick={() => setTab('EXPIRED')}
        >
          Expired
        </button>
        <button
          className={`px-4 py-2 rounded whitespace-nowrap ${
            tab === 'RESOLVED' ? 'bg-primary text-surface' : 'bg-surface text-content'
          }`}
          onClick={() => setTab('RESOLVED')}
        >
          Resolved
        </button>
        <button
          className={`px-4 py-2 rounded whitespace-nowrap ${
            tab === 'PENDING' ? 'bg-primary text-surface' : 'bg-surface text-content'
          }`}
          onClick={() => setTab('PENDING')}
        >
          Pending
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="p-4 text-center">
          {tab === 'OPEN' && 'No open predictions available.'}
          {tab === 'EXPIRED' && 'No expired predictions.'}
          {tab === 'RESOLVED' && 'No resolved predictions.'}
          {tab === 'PENDING' && 'No predictions pending approval.'}
        </p>
      ) : (
        <ul className="space-y-6">
          {filtered.map((pred) => {
            const now = Date.now();
            const expires = new Date(pred.expiresAt).getTime();

            // Badge
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

            const defaultOpt = pred.options[0]?.id;
            const parlaySel = parlayOptions[pred.id] ?? defaultOpt;
            const flatParlays: ParlayLegWithUser[] = pred.parlayLegs ?? [];

            return (
              <li
                key={pred.id}
                className="relative bg-surface border border-muted p-6 rounded-2xl shadow hover:shadow-lg transition"
              >
                {/* Badge */}
                <span
                  className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${badgeColor} text-white`}
                >
                  {badgeText}
                </span>

                {/* Title / desc */}
                <h2 className="text-2xl font-semibold mb-2">{pred.title}</h2>
                <p className="mb-3 text-base">{pred.description}</p>

                {/* Expiry */}
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

                {/* Odds */}
                <OddsBar
                  type={pred.type}
                  options={pred.options as PublicPredictionOption[]}
                  bets={pred.bets}
                  parlayLegs={flatParlays}
                />

                {/* Bets list */}
                {(pred.bets.length > 0 || flatParlays.length > 0) && (
                  <BetsList
                    type={pred.type}
                    bets={pred.bets}
                    parlayLegs={flatParlays}
                    options={pred.options as PublicPredictionOption[]}
                  />
                )}

                {/* Actions */}
                <div className="mt-6 flex flex-wrap gap-3 items-center">
                  {pred.approved && !pred.resolved && now <= expires && (
                    <>
                      <BetForm prediction={pred} />

                      {/* Parlay picker */}
                      <select
                        value={parlaySel}
                        onChange={(e) =>
                          setParlayOptions((prev) => ({
                            ...prev,
                            [pred.id]: Number(e.target.value),
                          }))
                        }
                        className="border p-2 rounded bg-background"
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
                            leg: { predictionId: pred.id, optionId: parlaySel! },
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

                  {pred.approved && pred.resolved && (
                    <p className="text-sm italic text-gray-600">
                      This prediction has been resolved.
                    </p>
                  )}

                  {pred.approved && !pred.resolved && now > expires && (
                    <p className="text-sm italic text-red-600">
                      This prediction has expired and is no longer accepting bets.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
