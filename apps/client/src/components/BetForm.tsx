// apps/client/src/components/BetForm.tsx
// -----------------------------------------------------------------------------
// Collapsible form for placing a single bet via `bet:place` socket command.
// `addOptimisticBet` is optional; if omitted we rely solely on the
// `betPlaced` broadcast to update the UI.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { usePredictionMarket } from '../contexts/PredictionContext';
import { useAuth } from '../contexts/AuthContext';
import type { PublicPredictionOption, BetWithUser } from '@ems/types';

interface BetFormProps {
  prediction: { id: number; options: PublicPredictionOption[] };
  addOptimisticBet?: (bet: BetWithUser) => void;
  onPlaced?: () => void;
}

export default function BetForm({ prediction, addOptimisticBet, onPlaced }: BetFormProps) {
  const { placeBet } = usePredictionMarket();
  const { user } = useAuth();

  const balance = user?.muskBucks ?? 0;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [optionId, setOptionId] = useState(prediction.options[0]?.id ?? 0);

  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    console.log('BetForm submit called', { amount, balance, optionId, placing });
    if (amount <= 0 || amount > balance || placing) {
      console.log('BetForm submit blocked', { amount, balance, placing });
      return;
    }
    console.log('BetForm calling placeBet');
    setPlacing(true);
    setErr(null);
    try {
      await placeBet({ optionId, amount });
      console.log('BetForm placeBet success');

      // optimistic UI update (optional)
      if (user && addOptimisticBet) {
        const optimistic: BetWithUser = {
          id: Date.now(),
          userId: user.id,
          predictionId: prediction.id,
          amount,
          oddsAtPlacement: 0,
          potentialPayout: 0,
          status: 'PENDING' as any,
          optionId,
          won: null as any,
          payout: 0,
          createdAt: new Date(),
          user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl ?? null,
          },
        };
        addOptimisticBet(optimistic);
      }

      setOpen(false);
      setAmount(0);
      onPlaced?.();
    } catch (e: any) {
      console.error('BetForm placeBet error', e);
      setErr(e.message || 'Bet failed');
    } finally {
      setPlacing(false);
    }
  };

  if (balance === 0) {
    return <p className="mt-2 text-sm text-tertiary italic">You have no MuskBucks to bet.</p>;
  }

  if (open) {
    return (
      <div
        className="absolute top-4 right-4 z-50 w-80 p-4 bg-surface border border-muted rounded-lg shadow-xl space-y-4"
        style={{
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
          <p className="text-sm">
            Balance: <span className="font-semibold">{balance} 🪙</span>
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">Bet Amount</label>
            <input
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full border p-2 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary border-muted"
              disabled={placing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Option</label>
            <select
              value={optionId}
              onChange={(e) => setOptionId(Number(e.target.value))}
              className="w-full border p-2 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary border-muted"
              disabled={placing}
            >
              {prediction.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={placing}
              className="px-4 py-2 bg-muted text-content rounded hover:bg-tertiary transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={placing || amount <= 0 || amount > balance}
              className="px-4 py-2 bg-primary text-surface rounded shadow hover:opacity-90 transition disabled:opacity-50"
            >
              {placing ? 'Placing…' : 'Place Bet'}
            </button>
          </div>
        </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Place Bet div clicked');
        if (!placing) setOpen(true);
      }}
      onMouseEnter={() => console.log('Mouse entered bet button')}
      onMouseLeave={() => console.log('Mouse left bet button')}
      className={`px-4 py-2 rounded-full font-semibold shadow cursor-pointer transition-all duration-200 inline-block ${
        placing 
          ? 'opacity-50 cursor-not-allowed bg-gray-400' 
          : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
      }`}
      style={{ 
        pointerEvents: 'auto',
        zIndex: 10000,
        position: 'relative',
        backgroundColor: placing ? '#9ca3af' : '#3b82f6',
        color: 'white',
        userSelect: 'none',
        display: 'inline-block',
        minWidth: '120px',
        textAlign: 'center'
      }}
    >
      {placing ? 'Placing…' : 'Place Bet'}
    </div>
  );
}