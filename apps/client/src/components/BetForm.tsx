import { useState } from 'react';
import { usePredictions } from '../hooks/usePredictions';

export default function BetForm({
  predictionId,
  onPlaced,
}: {
  predictionId: number;
  onPlaced: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [option, setOption] = useState<'YES' | 'NO'>('YES');
  const [loading, setLoading] = useState(false);
  const { placeBet } = usePredictions();

  const submit = async () => {
    setLoading(true);
    try {
      // replace `1` with your current user’s ID
      await placeBet(predictionId, 1, amount, option);
      onPlaced();
    } catch (err) {
      console.error(err);
      alert('Bet failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 flex items-center space-x-2">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(+e.target.value)}
        placeholder="Amount"
        className="w-20 border p-1 rounded"
      />
      <select
        value={option}
        onChange={(e) => setOption(e.target.value as any)}
        className="border p-1 rounded"
      >
        <option value="YES">YES</option>
        <option value="NO">NO</option>
      </select>
      <button
        disabled={loading || amount <= 0}
        onClick={submit}
        className="px-2 py-1 bg-green-500 text-white rounded"
      >
        {loading ? '...' : 'Bet'}
      </button>
    </div>
  );
}
