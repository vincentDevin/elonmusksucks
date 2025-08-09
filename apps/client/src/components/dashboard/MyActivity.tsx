import { useState, useEffect } from 'react';
import { useMyBets, useMyParlays, useMyPredictions } from '../../hooks/useMeStubs';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface ActivityItem {
  id: number;
  predictionTitle?: string;
  title?: string;
  legCount?: number;
  optionLabel?: string;
  category?: string;
  combinedOdds?: number;
  amount?: number;
  odds?: number;
  potentialPayout?: number;
}

export default function MyActivity() {
  const socket = useSocket();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const myBets = useMyBets();
  const myParlays = useMyParlays();
  const myPredictions = useMyPredictions();

  const isLoading = myBets.loading || myParlays.loading || myPredictions.loading;

  // Listen for bet and parlay status changes
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleBetStatusChange = (data: any) => {
      console.log('[MyActivity] Bet status changed:', data);
      if (data.userId === user.id) {
        // Refresh bets data
        myBets.refetch?.();
      }
    };

    const handleParlayStatusChange = (data: any) => {
      console.log('[MyActivity] Parlay status changed:', data);
      if (data.userId === user.id) {
        // Refresh parlays data
        myParlays.refetch?.();
      }
    };

    socket.on('bet:status_change', handleBetStatusChange);
    socket.on('parlay:status_change', handleParlayStatusChange);

    return () => {
      socket.off('bet:status_change', handleBetStatusChange);
      socket.off('parlay:status_change', handleParlayStatusChange);
    };
  }, [socket, user?.id, myBets, myParlays]);

  const filteredData = (): ActivityItem[] => {
    switch (filter) {
      case 'bets':
        return myBets.data || [];
      case 'parlays':
        return myParlays.data || [];
      case 'predictions':
        return myPredictions.data || [];
      default:
        return [...(myBets.data || []), ...(myParlays.data || []), ...(myPredictions.data || [])];
    }
  };

  return (
    <section className="bg-surface border border-muted rounded-2xl p-4 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-content">My Activity</h2>
        <select
          onChange={(e) => setFilter(e.target.value)}
          className="bg-background border border-muted rounded-md px-2 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="bets">Bets</option>
          <option value="parlays">Parlays</option>
          <option value="predictions">Predictions</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-tertiary">Loading activity...</span>
        </div>
      ) : (
        <ul className="text-sm space-y-2 pr-2">
          {filteredData().map((item) => (
            <li
              key={item.id}
              className="flex justify-between py-2 px-3 bg-background/50 rounded-lg"
            >
              <div className="flex flex-col">
                <span className="text-content font-medium break-words">
                  {item.predictionTitle || item.title || `${item.legCount} legs`}
                </span>
                <span className="text-tertiary text-xs">
                  {item.optionLabel || item.category || `@ ${item.combinedOdds?.toFixed(2)}x odds`}
                </span>
              </div>
              <div className="text-right">
                <div className="text-primary font-medium">
                  {item.amount ? `${item.amount}🪙` : ''}
                </div>
                <div className="text-xs text-tertiary">
                  {item.odds
                    ? `@ ${item.odds.toFixed(2)}x`
                    : item.potentialPayout
                      ? `→ ${item.potentialPayout}🪙`
                      : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
