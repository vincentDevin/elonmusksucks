import { useActivityTicker } from '../hooks/useActivityTicker';
import { useMemo } from 'react';

export default function ActivityTicker() {
  const { items } = useActivityTicker(20);

  const text = useMemo(() => {
    return items
      .map((a) => formatActivity(a))
      .join('   •   ');
  }, [items]);

  if (!items.length) return null;

  return (
    <div className="bg-blue-600 text-white overflow-hidden whitespace-nowrap text-sm">
      <div className="animate-marquee px-4 py-1">{text}</div>
    </div>
  );
}

function formatActivity(a: { type: string; details?: any }) {
  const d = a.details && typeof a.details === 'object' ? a.details : {};
  switch (a.type) {
    case 'BET_PLACED':
      return `Bet placed on #${d.predictionId ?? ''}`.trim();
    case 'PARLAY_PLACED':
      return `Parlay started #${d.parlayId ?? ''}`.trim();
    case 'POST_CREATED':
      return 'New profile post';
    case 'COMMENT_CREATED':
      return 'New comment';
    case 'PREDICTION_CREATED':
      return `Prediction: ${d.title ?? ''}`.trim();
    default:
      return a.type;
  }
}
