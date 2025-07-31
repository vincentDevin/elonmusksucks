// apps/client/src/components/CompactPredictionCard.tsx
import { useState } from 'react';
import type {
  PublicPredictionOption,
  BetWithUser,
  ParlayLegWithUser,
  PredictionType,
} from '@ems/types';
import type { PredictionFull } from '../api/predictions';
import CompactOddsBar from './CompactOddsBar';
import BetModal from './BetModal';
import { useParlay } from '../contexts/ParlayContext';

/** Compact card designed specifically for the dashboard */
interface Props {
  prediction: PredictionFull;
}

export default function CompactPredictionCard({ prediction }: Props) {
  const { dispatch: parlayDispatch } = useParlay();
  const [addingToParlay, setAddingToParlay] = useState<number | null>(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [selectedParlayOption, setSelectedParlayOption] = useState(prediction.options[0]?.id || 0);
  const [showParlaySelector, setShowParlaySelector] = useState(false);

  const flatParlays: ParlayLegWithUser[] = prediction.parlayLegs ?? [];

  const now = Date.now();
  const expires = new Date(prediction.expiresAt).getTime();
  
  const getStatusBadge = () => {
    if (prediction.resolved) {
      return { color: 'bg-accent', text: 'Resolved' };
    } else if (now > expires) {
      return { color: 'bg-error', text: 'Expired' };
    } else {
      return { color: 'bg-success', text: 'Open' };
    }
  };
  
  const statusBadge = getStatusBadge();

  // Enhanced parlay addition with user choice
  const handleAddToParlay = (optionId: number) => {
    if (!prediction.options.length) return;
    
    const selectedOption = prediction.options.find(opt => opt.id === optionId);
    if (!selectedOption) return;
    
    setAddingToParlay(optionId);
    
    parlayDispatch({
      type: 'ADD_LEG',
      leg: { 
        predictionId: prediction.id, 
        optionId, 
        label: selectedOption.label 
      },
    });

    // Visual feedback with toast-like notification
    setTimeout(() => {
      setAddingToParlay(null);
      setShowParlaySelector(false);
    }, 1200);
  };

  // Toggle parlay selector
  const toggleParlaySelector = () => {
    setShowParlaySelector(!showParlaySelector);
  };

  // Calculate total activity for display
  const totalBets = prediction.bets.length + flatParlays.length;
  const totalVolume = prediction.bets.reduce((sum, bet) => sum + bet.amount, 0) + 
                      flatParlays.reduce((sum, leg) => sum + leg.stake, 0);

  return (
    <div className="relative bg-surface border border-muted p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-muted/60">
      {/* Status Badge */}
      <span
        className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-surface ${statusBadge.color}`}
      >
        {statusBadge.text}
      </span>

      {/* Title (truncated for compact view) */}
      <h3 className="text-lg font-semibold mb-2 pr-16 line-clamp-2 text-content">{prediction.title}</h3>

      {/* Quick stats */}
      <div className="flex items-center gap-3 mb-3 text-sm text-tertiary">
        <span className="flex items-center gap-1">
          <span className="text-primary">📊</span>
          {totalBets} bets
        </span>
        {totalVolume > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-primary">💰</span>
            ${totalVolume.toLocaleString()}
          </span>
        )}
        {!prediction.resolved && (
          <span className={`text-xs ${now > expires ? 'text-error' : 'text-tertiary'}`}>
            {now > expires ? 'Expired' : `${Math.ceil((expires - now) / (1000 * 60 * 60))}h left`}
          </span>
        )}
      </div>

      {/* Compact Odds */}
      <CompactOddsBar
        type={prediction.type as PredictionType}
        options={prediction.options as PublicPredictionOption[]}
        bets={prediction.bets}
        parlayLegs={flatParlays}
        predictionId={prediction.id}
        expiresAt={prediction.expiresAt}
      />

      {/* Enhanced Parlay Option Selector */}
      {showParlaySelector && !prediction.resolved && now <= expires && (
        <div className="mt-3 p-3 bg-secondary/20 rounded-lg border border-secondary">
          <div className="text-sm font-medium text-content mb-2">Choose option for parlay:</div>
          <div className="space-y-2">
            {prediction.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAddToParlay(option.id)}
                disabled={addingToParlay !== null}
                className={`w-full p-2 rounded-lg text-sm transition-all duration-200 text-left ${
                  addingToParlay === option.id
                    ? 'bg-success text-surface scale-105'
                    : 'bg-surface border border-muted hover:border-primary hover:scale-102'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-primary font-bold">{option.odds.toFixed(2)}×</span>
                </div>
                {addingToParlay === option.id && (
                  <div className="text-xs mt-1 opacity-90">✅ Added to parlay!</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compact Actions */}
      {!prediction.resolved && now <= expires && (
        <div className="mt-3 flex gap-2">
          {/* Bet Button - Opens Modal */}
          <button
            onClick={() => setShowBetModal(true)}
            className="flex-1 px-3 py-2 bg-info hover:bg-info/90 text-surface text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
          >
            <span className="flex items-center justify-center space-x-1">
              <span>🎯</span>
              <span>Bet</span>
            </span>
          </button>

          {/* Parlay Button - Shows Selector */}
          <button
            onClick={toggleParlaySelector}
            disabled={addingToParlay !== null}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              showParlaySelector
                ? 'bg-secondary text-content border-2 border-secondary'
                : addingToParlay !== null
                ? 'bg-success text-surface scale-105'
                : 'bg-warning hover:bg-warning/90 text-surface hover:scale-105'
            }`}
          >
            {addingToParlay !== null ? (
              <span className="flex items-center space-x-1">
                <span>✅</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1">
                <span>📈</span>
                <span>{showParlaySelector ? '^' : 'v'}</span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* Recent activity indicator */}
      {totalBets > 0 && (
        <div className="mt-2 flex items-center justify-between text-xs text-tertiary">
          <span>
            Latest: {prediction.bets[prediction.bets.length - 1]?.user?.name || 'Anonymous'}
          </span>
          <span className="flex items-center gap-1">
            {prediction.options.find(opt => 
              prediction.bets.some(bet => bet.optionId === opt.id && bet.amount > 500)
            ) && <span title="High-stakes activity">🔥</span>}
            {flatParlays.length > 0 && <span title="Parlay activity">📈</span>}
          </span>
        </div>
      )}
      {/* Bet Modal */}
      <BetModal
        prediction={prediction}
        isOpen={showBetModal}
        onClose={() => setShowBetModal(false)}
        mode="compact"
        onBetPlaced={() => {
          // Handle optimistic update if needed
          console.log('Bet placed from compact card');
        }}
      />
    </div>
  );
}