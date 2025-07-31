// apps/client/src/components/dashboard/MyStuffPanel.tsx
import { useMyBets, useMyParlays, useMyPredictions } from '../../hooks/useMeStubs';

export default function MyStuffPanel() {
  const myBets = useMyBets();
  const myParlays = useMyParlays();
  const myPredictions = useMyPredictions();

  const isLoading = myBets.loading || myParlays.loading || myPredictions.loading;
  const hasErrors = myBets.error || myParlays.error || myPredictions.error;

  if (isLoading) {
    return (
      <section className="bg-surface border border-muted rounded-2xl p-4 shadow-lg">
        <h2 className="text-lg font-semibold mb-3 text-content">My Activity</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-tertiary">Loading activity...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface border border-muted rounded-2xl p-4 shadow-lg">
      <h2 className="text-lg font-semibold mb-3 text-content">My Activity</h2>

      <div className="space-y-4 pr-2">
        <div>
          <h3 className="font-medium mb-2 text-content">Open Bets</h3>
          {myBets.error ? (
            <p className="text-red-500 text-sm">{myBets.error}</p>
          ) : myBets.data?.length === 0 ? (
            <p className="text-tertiary text-sm italic">No open bets</p>
          ) : (
            <ul className="text-sm space-y-1">
              {myBets.data?.slice(0, 5).map((bet) => (
                <li key={bet.id} className="flex justify-between py-1 px-2 bg-background/50 rounded">
                  <div className="flex flex-col">
                    <span className="text-content font-medium break-words">
                      {bet.predictionTitle}
                    </span>
                    {bet.optionLabel && (
                      <span className="text-tertiary text-xs">{bet.optionLabel}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-primary font-medium">
                      {bet.amount}🪙
                    </div>
                    <div className="text-xs text-tertiary">
                      @ {bet.odds.toFixed(2)}×
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-medium mb-2 text-content">Active Parlays</h3>
          {myParlays.error ? (
            <p className="text-red-500 text-sm">{myParlays.error}</p>
          ) : myParlays.data?.length === 0 ? (
            <p className="text-tertiary text-sm italic">No active parlays</p>
          ) : (
            <ul className="text-sm space-y-1">
              {myParlays.data?.slice(0, 5).map((parlay) => (
                <li key={parlay.id} className="py-1 px-2 bg-background/50 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-content font-medium">
                        {parlay.legCount} legs
                      </span>
                      <span className="text-tertiary text-xs">
                        @ {parlay.combinedOdds.toFixed(2)}× odds
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-medium">
                        {parlay.amount}🪙
                      </div>
                      <div className="text-xs text-tertiary">
                        → {parlay.potentialPayout}🪙
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-medium mb-2 text-content">My Predictions</h3>
          {myPredictions.error ? (
            <p className="text-red-500 text-sm">{myPredictions.error}</p>
          ) : myPredictions.data?.length === 0 ? (
            <p className="text-tertiary text-sm italic">No predictions</p>
          ) : (
            <ul className="text-sm space-y-1">
              {myPredictions.data?.slice(0, 5).map((prediction) => (
                <li key={prediction.id} className="flex justify-between py-1 px-2 bg-background/50 rounded">
                  <div className="flex flex-col pr-2">
                    <span className="text-content font-medium break-words">
                      {prediction.title}
                    </span>
                    <span className="text-tertiary text-xs">
                      {prediction.category} • {prediction.totalBets || 0} bets
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs italic whitespace-nowrap ${
                      prediction.approved 
                        ? prediction.resolved 
                          ? 'text-gray-600 dark:text-gray-400' 
                          : 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {prediction.approved 
                        ? prediction.resolved 
                          ? 'resolved' 
                          : 'live'
                        : 'pending'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {hasErrors && (
        <div className="mt-3 pt-3 border-t border-muted text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Retry loading data
          </button>
        </div>
      )}
    </section>
  );
}
