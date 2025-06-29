// apps/client/src/components/BetForm.tsx

// apps/client/src/components/BetForm.tsx
import { useState } from 'react';
import { useBetting } from '../hooks/useBetting';
import { useAuth } from '../contexts/AuthContext';
import type { PublicPredictionOption } from '@ems/types';

interface BetFormProps {
  // now we just need the prediction so we can read its options[]
  prediction: {
    options: PublicPredictionOption[];
  };
  onPlaced: () => void;
}

export default function BetForm({ prediction, onPlaced }: BetFormProps) {
  const { options } = prediction;
  const { placeBet, loading: placing, error } = useBetting();
  const { user } = useAuth();
  const balance = user?.muskBucks ?? 0;

  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState(0);
  // default to first option’s id (whatever that may be)
  const [optionId, setOptionId] = useState<number>(options.length > 0 ? options[0].id : 0);

  const submit = async () => {
    if (amount <= 0 || amount > balance) return;
    try {
      await placeBet({ optionId, amount });
      onPlaced();
      setExpanded(false);
    } catch (err: any) {
      console.error(err);
      alert('Bet failed: ' + (error?.message || err.message));
    }
  };

  if (balance === 0) {
    return <p className="mt-2 text-sm text-gray-500 italic">You have no MuskBucks to bet.</p>;
  }

  return expanded ? (
    <div className="mt-2 p-4 bg-surface border border-muted rounded-lg shadow-md space-y-4">
      {/* Balance */}
      <p className="text-sm">
        Balance: <span className="font-semibold">{balance} 🪙</span>
      </p>

      {/* Amount input */}
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
        />
      </div>

      {/* Option dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Option</label>
        <select
          value={optionId}
          onChange={(e) => setOptionId(Number(e.target.value))}
          className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
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
    </div>
  ) : (
    <button
      onClick={() => setExpanded(true)}
      disabled={placing}
      className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold shadow transform hover:scale-105 transition disabled:opacity-50 w-full sm:w-auto"
    >
      Place Bet
    </button>
  );
}
