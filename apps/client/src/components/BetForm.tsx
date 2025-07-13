// apps/client/src/components/BetForm.tsx
import { useState } from 'react';
import { useBetting } from '../hooks/useBetting';
import { useAuth } from '../contexts/AuthContext';
import type { PublicPredictionOption, PublicBet, BetWithUser } from '@ems/types';

interface BetFormProps {
  prediction: { id: number; options: PublicPredictionOption[] };
  addOptimisticBet: (bet: BetWithUser) => void;
  onPlaced?: (bet: PublicBet) => void;
}

export default function BetForm({ prediction, addOptimisticBet, onPlaced }: BetFormProps) {
  const { options } = prediction;
  const { placeBet, loading: placing, error } = useBetting();
  const { user } = useAuth();
  const balance = user?.muskBucks ?? 0;

  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState(0);
  const [optionId, setOptionId] = useState(options.length > 0 ? options[0].id : 0);

  const submit = async () => {
    if (amount <= 0 || amount > balance || placing) return;
    try {
      const bet = await placeBet({ optionId, amount });
      if (user) {
        const optimistic: BetWithUser = {
          ...bet,
          predictionId: prediction.id,
          user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl ?? null,
          },
        };
        addOptimisticBet(optimistic);
        // console.log('Added optimistic bet', optimistic);
      }
      setExpanded(false);
      setAmount(0);
      onPlaced?.(bet);
    } catch (err: any) {
      // Error handled below
    }
  };

  if (balance === 0) {
    return <p className="mt-2 text-sm text-gray-500 italic">You have no MuskBucks to bet.</p>;
  }

  if (expanded) {
    return (
      <div className="mt-2 p-4 bg-surface border border-muted rounded-lg shadow-md space-y-4">
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
            placeholder="Enter amount"
            className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={placing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Option</label>
          <select
            value={optionId}
            onChange={(e) => setOptionId(Number(e.target.value))}
            className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={placing}
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            disabled={placing}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={placing || amount <= 0 || amount > balance}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition disabled:opacity-50"
          >
            {placing ? 'Placing…' : 'Place Bet'}
          </button>
        </div>
        {placing && <p className="text-xs text-gray-500 mt-2">Placing your bet…</p>}
        {error && <p className="text-xs text-red-500 mt-2">{error.message || String(error)}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      disabled={placing}
      className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold shadow transform hover:scale-105 transition disabled:opacity-50 w-full sm:w-auto"
    >
      {placing ? 'Placing…' : 'Place Bet'}
    </button>
  );
}
