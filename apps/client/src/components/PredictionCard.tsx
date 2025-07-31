// apps/client/src/components/PredictionCard.tsx
import { useState } from 'react';
import type {
  PublicPredictionOption,
  BetWithUser,
  ParlayLegWithUser,
  PredictionType,
} from '@ems/types';
import type { PredictionFull } from '../api/predictions';
import OddsBar from './OddsBar';
import BetsList from './BetsList';
import BetModal from './BetModal';

/** Enhanced card for the main Predictions page */
interface Props {
  prediction: PredictionFull;
  /** Optional callback when a bet/parlay leg is placed (for optimistic UI) */
  addOptimisticBet?: (bet: BetWithUser) => void;
}

export default function PredictionCard({ prediction, addOptimisticBet }: Props) {
  const [showBetModal, setShowBetModal] = useState(false);

  const flatParlays: ParlayLegWithUser[] = prediction.parlayLegs ?? [];

  const now = Date.now();
  const expires = new Date(prediction.expiresAt).getTime();
  const timeLeft = expires - now;
  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
  
  // Enhanced status logic using theme tokens
  const getStatusBadge = () => {
    if (prediction.resolved) {
      return { color: 'bg-accent', text: 'Resolved', icon: '✅' };
    } else if (now > expires) {
      return { color: 'bg-error', text: 'Expired', icon: '⏰' };
    } else if (hoursLeft <= 2) {
      return { color: 'bg-warning', text: 'Ending Soon', icon: '🔥' };
    } else if (hoursLeft <= 24) {
      return { color: 'bg-info', text: 'Final Day', icon: '⚡' };
    } else {
      return { color: 'bg-success', text: 'Open', icon: '🟢' };
    }
  };
  
  const statusBadge = getStatusBadge();

  // Calculate engagement metrics
  const totalBets = prediction.bets.length + flatParlays.length;
  const totalVolume = prediction.bets.reduce((sum, bet) => sum + bet.amount, 0) + 
                      flatParlays.reduce((sum, leg) => sum + leg.stake, 0);
  const recentActivity = prediction.bets.filter(bet => 
    new Date(bet.createdAt).getTime() > Date.now() - 30 * 60 * 1000
  ).length;

  return (
    <li className="relative bg-surface border border-muted p-5 rounded-2xl shadow hover:shadow-lg transition">
      {/* Enhanced Status Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-medium text-surface ${statusBadge.color} flex items-center gap-1`}>
          <span>{statusBadge.icon}</span>
          {statusBadge.text}
        </span>
        {recentActivity > 0 && (
          <span className="px-2 py-1 bg-secondary text-primary text-xs rounded-full font-semibold animate-pulse">
            🔥 Hot
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold mb-2 text-content pr-24">{prediction.title}</h3>
      
      {/* Engagement metrics */}
      <div className="flex items-center gap-4 text-sm text-tertiary mb-3">
        <span className="flex items-center gap-1">
          <span className="text-primary">📊</span>
          {totalBets} bets
        </span>
        {totalVolume > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-primary">💰</span>
            ${totalVolume.toLocaleString()} volume
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="text-primary">📈</span>
          {flatParlays.length} parlays
        </span>
      </div>

      {/* Mini meta line */}
      {!prediction.resolved && (
        <div className={`text-sm font-medium flex items-center gap-2 mb-4 ${
          now > expires ? 'text-error' : hoursLeft <= 2 ? 'text-warning' : hoursLeft <= 24 ? 'text-info' : 'text-success'
        }`}>
          <span>{statusBadge.icon}</span>
          {now > expires ? (
            `Expired ${new Date(prediction.expiresAt).toLocaleString()}`
          ) : hoursLeft <= 24 ? (
            `${hoursLeft}h ${Math.ceil((timeLeft % (1000 * 60 * 60)) / (1000 * 60))}m remaining`
          ) : (
            `Expires ${new Date(prediction.expiresAt).toLocaleString()}`
          )}
        </div>
      )}

      {/* Odds visual */}
      <OddsBar
        type={prediction.type as PredictionType}
        options={prediction.options as PublicPredictionOption[]}
        bets={prediction.bets}
        parlayLegs={flatParlays}
        predictionId={prediction.id}
        expiresAt={prediction.expiresAt}
      />

      {/* Recent bets */}
      {(prediction.bets.length > 0 || flatParlays.length > 0) && (
        <BetsList
          type={prediction.type as PredictionType}
          bets={prediction.bets}
          parlayLegs={flatParlays}
          options={prediction.options as PublicPredictionOption[]}
        />
      )}

      {/* Enhanced Betting Action */}
      {!prediction.resolved && (
        <div className="mt-4">
          <button
            onClick={() => setShowBetModal(true)}
            className="w-full py-3 px-6 bg-info hover:bg-info/90 text-surface font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <span className="flex items-center justify-center space-x-2">
              <span>🎯</span>
              <span>Place Your Bet</span>
              <span>💰</span>
            </span>
          </button>
          
          {/* Helpful tip */}
          <div className="mt-2 text-xs text-tertiary text-center">
            💡 Use the dashboard parlay builder for multi-prediction bets
          </div>
        </div>
      )}

      {/* Enhanced Bet Modal */}
      <BetModal
        prediction={prediction}
        isOpen={showBetModal}
        onClose={() => setShowBetModal(false)}
        mode="full"
        onBetPlaced={addOptimisticBet}
      />
    </li>
  );
}