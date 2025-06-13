import { useState } from 'react';
import { usePredictions } from '../hooks/usePredictions';
import { useAuth } from '../contexts/AuthContext';

interface BetFormProps {
  predictionId: number;
  onPlaced: () => void;
}

export default function BetForm({ predictionId, onPlaced }: BetFormProps) {
  const { placeBet } = usePredictions();
  const { user } = useAuth();
  const balance = user?.muskBucks ?? 0;

  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState(0);
  const [option, setOption] = useState<'YES' | 'NO'>('YES');
  const [loading, setLoading] = useState(false);
  const baseBtn =
    'px-4 py-2 rounded-full text-white font-semibold shadow transform transition hover:scale-105 disabled:opacity-50';

  const submit = async () => {
    if (amount <= 0 || amount > balance) return;
    setLoading(true);
    try {
      await placeBet(predictionId, user!.id, amount, option);
      onPlaced();
      setExpanded(false);
    } catch (err) {
      console.error(err);
      alert('Bet failed');
    } finally {
      setLoading(false);
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
        <label className="block text-sm font-medium mb-1">Choose Option</label>
        <select
          value={option}
          onChange={(e) => setOption(e.target.value as 'YES' | 'NO')}
          className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="YES">YES</option>
          <option value="NO">NO</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          disabled={loading}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={loading || amount <= 0 || amount > balance}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? 'Placing…' : 'Place Bet'}
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setExpanded(true)}
      className={`
    ${baseBtn}
    bg-blue-500 hover:bg-blue-600
    mt-2 w-full sm:w-auto
  `}
    >
      Place Bet
    </button>
  );
}
