import { useState } from 'react';
import { resolvePrediction } from '../api/predictions';

interface ResolvePredictionProps {
  predictionId: number;
  onResolved: () => void;
}

export default function ResolvePrediction({ predictionId, onResolved }: ResolvePredictionProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleResolve = async (outcome: 'YES' | 'NO') => {
    setLoading(true);
    try {
      await resolvePrediction(predictionId, outcome);
      onResolved();
    } catch (err) {
      console.error(err);
      alert('Failed to resolve prediction');
    } finally {
      setLoading(false);
      setExpanded(false);
    }
  };

  // Unified button style
  const baseBtn =
    'px-4 py-2 rounded-full text-white font-semibold shadow transform transition hover:scale-105 disabled:opacity-50';

  return expanded ? (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        disabled={loading}
        onClick={() => handleResolve('YES')}
        className={`${baseBtn} bg-green-500 hover:bg-green-600`}
      >
        {loading ? '...' : 'YES'}
      </button>
      <button
        disabled={loading}
        onClick={() => handleResolve('NO')}
        className={`${baseBtn} bg-red-500 hover:bg-red-600`}
      >
        {loading ? '...' : 'NO'}
      </button>
      <button
        disabled={loading}
        onClick={() => setExpanded(false)}
        className={`${baseBtn} bg-gray-400 hover:bg-gray-500 text-gray-800`}
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      onClick={() => setExpanded(true)}
      className={`
        ${baseBtn} 
        bg-red-600 hover:bg-red-700 
        mt-2 w-full sm:w-auto
      `}
    >
      Resolve
    </button>
  );
}
