import type { TrendingPreviewProps } from '../types';

export default function TrendingPreview({
  data,
  className = '',
  clientAppUrl,
}: TrendingPreviewProps) {
  // Use API data if available, otherwise empty array (no fallback data to avoid type conflicts)
  const predictions = Array.isArray(data) ? data : [];

  const calculateVolume = (prediction: any) => {
    if (!prediction.bets || !Array.isArray(prediction.bets)) return 0;
    return prediction.bets.reduce((total: number, bet: any) => {
      const amount = parseInt(bet.amount) || 0;
      return total + amount;
    }, 0);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      Tesla: 'bg-error/10 text-error border-error/20',
      Twitter: 'bg-info/10 text-info border-info/20',
      SpaceX: 'bg-secondary/10 text-secondary border-secondary/20',
      Neuralink: 'bg-success/10 text-success border-success/20',
      default: 'bg-muted/20 text-content border-border',
    };
    return colors[category as keyof typeof colors] || colors.default;
  };

  return (
    <div className={`bg-surface rounded-lg p-6 shadow ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-content">🔥 Trending Predictions</h2>
        <a href="/predictions" className="text-primary hover:underline text-sm font-medium">
          View all →
        </a>
      </div>

      {predictions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🔮</div>
          <p className="text-tertiary">No trending predictions available yet</p>
          <p className="text-sm text-tertiary mt-2">Check back soon for exciting predictions!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {predictions.slice(0, 5).map((prediction, index) => (
            <div
              key={prediction.id}
              className="border border-border rounded-lg p-4 hover:bg-muted/5 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-tertiary text-sm">#{index + 1}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(prediction.category)}`}
                    >
                      {prediction.category}
                    </span>
                  </div>
                  <h3 className="font-medium text-content text-sm leading-snug mb-2">
                    {prediction.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-xs text-tertiary">
                    <span>💰 {formatVolume(calculateVolume(prediction))} MuskBucks</span>
                    <span>👥 {prediction.bets?.length || 0} bets</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <a
          href={`${clientAppUrl}/register`}
          className="block w-full text-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          Join the action!
        </a>
      </div>
    </div>
  );
}
