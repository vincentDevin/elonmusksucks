// apps/client/src/components/ResolvePrediction.tsx
import { useState } from 'react';
import { resolvePrediction } from '../api/predictions';

interface ResolvePredictionProps {
  predictionId: number;
  onResolved: () => void;
}

export default function ResolvePrediction({ predictionId, onResolved }: ResolvePredictionProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResolve = async (optionId: number) => {
    setLoading(true);
    try {
      await resolvePrediction(predictionId, optionId);
      onResolved();
    } catch (err: any) {
      console.error(err);
      alert('Failed to resolve prediction: ' + err.toString());
    } finally {
      setLoading(false);
      setExpanded(false);
    }
  };

  const baseBtn =
    'px-4 py-2 rounded-full text-white font-semibold shadow transform transition hover:scale-105 disabled:opacity-50';

  return expanded ? (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        disabled={loading}
        onClick={() => handleResolve(1)}
        className={`${baseBtn} bg-green-500 hover:bg-green-600`}
      >
        {loading ? '...' : 'YES'}
      </button>
      <button
        disabled={loading}
        onClick={() => handleResolve(2)}
        className={`${baseBtn} bg-red-500 hover:bg-red-600`}
      >
        {loading ? '...' : 'NO'}
      </button>
      <button
        type="button"
        onClick={() => setExpanded(false)}
        disabled={loading}
        className={`${baseBtn} bg-gray-400 hover:bg-gray-500 text-gray-800`}
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className={`${baseBtn} bg-red-600 hover:bg-red-700 mt-2 w-full sm:w-auto`}
    >
      Resolve
    </button>
  );
}
