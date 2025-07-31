// apps/client/src/pages/Predictions.tsx
// -----------------------------------------------------------------------------
// Main predictions list page with enhanced betting experience.
// Uses PredictionCard components with the new BetModal system.
// Parlay functionality has been moved to the dashboard.
// -----------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import type { PredictionFull } from '../api/predictions';

import CreatePredictionForm from '../components/CreatePredictionForm';
import PredictionCard from '../components/PredictionCard';

import { usePredictionMarket } from '../contexts/PredictionContext';
import { useAuth } from '../contexts/AuthContext';


export default function Predictions() {
  const { predictions: raw, loading, error, createPrediction } = usePredictionMarket();
  const { user } = useAuth();

  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<'OPEN' | 'EXPIRED' | 'RESOLVED' | 'PENDING'>('OPEN');

  const filtered = useMemo(() => {
    const now = Date.now();
    return raw.filter((p) => {
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
  }, [raw, tab]);

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
            // Only show approved predictions or user's own predictions
            if (!pred.approved && pred.creatorId !== user?.id) {
              return null;
            }

            // For non-approved predictions, show status message
            if (!pred.approved) {
              return (
                <li
                  key={pred.id}
                  className="relative bg-surface border border-muted p-6 rounded-2xl shadow"
                >
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium bg-yellow-600 text-white">
                    Pending
                  </span>
                  <h2 className="text-2xl font-semibold mb-2 text-content pr-24">{pred.title}</h2>
                  <p className="mb-3 text-base text-tertiary">{pred.description}</p>
                  <p className="text-sm italic text-yellow-600">
                    Your prediction is awaiting admin approval.
                  </p>
                </li>
              );
            }

            // For approved predictions, use the enhanced PredictionCard
            return (
              <PredictionCard
                key={pred.id}
                prediction={pred}
                addOptimisticBet={(bet) => {
                  // Handle optimistic bet update if needed
                  console.log('Optimistic bet placed:', bet);
                }}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
