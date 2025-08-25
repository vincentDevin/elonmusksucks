// apps/client/src/components/dashboard/QuickBetModal.tsx
import { useState, useEffect } from 'react';

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);
import { usePredictionMarket } from '../../contexts/PredictionContext';
import BetModal from '../BetModal';
import type { PredictionFull } from '../../api/predictions';

interface QuickBetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickBetModal({ isOpen, onClose }: QuickBetModalProps) {
  const { predictions, loading } = usePredictionMarket();
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionFull | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBetModal, setShowBetModal] = useState(false);

  // Filter active predictions for quick betting
  const activePredictions = predictions.filter(
    (pred) => !pred.resolved && new Date(pred.expiresAt) > new Date(),
  );

  // Search filtered predictions
  const filteredPredictions = activePredictions.filter(
    (pred) =>
      pred.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pred.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Sort by popularity (total bets) and recency
  const sortedPredictions = filteredPredictions.sort((a, b) => {
    const aTotalBets = a.bets?.length || 0;
    const bTotalBets = b.bets?.length || 0;
    if (aTotalBets !== bTotalBets) {
      return bTotalBets - aTotalBets; // More bets first
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Newer first
  });

  const topPredictions = sortedPredictions.slice(0, 10);

  const handlePredictionSelect = (prediction: PredictionFull) => {
    setSelectedPrediction(prediction);
    setShowBetModal(true);
  };

  const handleBetModalClose = () => {
    setShowBetModal(false);
    setSelectedPrediction(null);
  };

  const handleBetPlaced = () => {
    setShowBetModal(false);
    setSelectedPrediction(null);
    onClose(); // Close the quick bet modal after successful bet
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedPrediction(null);
      setShowBetModal(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Quick Bet Selection Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]">
        <div className="bg-surface border border-muted rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-muted">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-content flex items-center">
                  <span className="mr-2">💰</span>
                  Quick Bet
                </h2>
                <p className="text-sm text-tertiary mt-1">Choose a prediction to bet on</p>
              </div>
              <button
                onClick={onClose}
                className="text-tertiary hover:text-content transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div className="mt-4">
              <input
                type="text"
                placeholder="Search predictions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-96">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-tertiary">Loading predictions...</span>
              </div>
            ) : topPredictions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-tertiary">
                  {searchTerm
                    ? 'No predictions found matching your search.'
                    : 'No active predictions available for betting.'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {topPredictions.map((prediction) => {
                  const totalBets = prediction.bets?.length || 0;
                  const totalVolume =
                    prediction.bets?.reduce<number>((sum, bet) => sum + asNum(bet.amount), 0) || 0;
                  const timeLeft = new Date(prediction.expiresAt).getTime() - Date.now();
                  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

                  return (
                    <button
                      key={prediction.id}
                      onClick={() => handlePredictionSelect(prediction)}
                      className="w-full p-4 bg-background/50 hover:bg-background border border-muted rounded-lg transition-all duration-200 hover:scale-[1.02] text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-content line-clamp-2 mb-2">
                            {prediction.title}
                          </h3>

                          <div className="flex items-center gap-3 text-sm text-tertiary">
                            {prediction.category && (
                              <span className="flex items-center gap-1">
                                <span>📂</span>
                                {prediction.category}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span>📊</span>
                              {totalBets} bets
                            </span>
                            {totalVolume > 0 && (
                              <span className="flex items-center gap-1">
                                <span>💰</span>
                                {totalVolume.toLocaleString()}🪙
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span>⏰</span>
                              {hoursLeft}h left
                            </span>
                          </div>

                          {/* Options preview */}
                          <div className="mt-2 flex gap-2">
                            {prediction.options.slice(0, 3).map((option) => (
                              <span
                                key={option.id}
                                className="px-2 py-1 bg-muted rounded text-xs text-content"
                              >
                                {option.label} @{option.odds.toFixed(1)}×
                              </span>
                            ))}
                            {prediction.options.length > 3 && (
                              <span className="px-2 py-1 bg-muted rounded text-xs text-tertiary">
                                +{prediction.options.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 text-right">
                          <div className="text-lg">🎯</div>
                          <div className="text-xs text-tertiary mt-1">Click to bet</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-muted bg-background/30">
            <div className="flex items-center justify-between text-sm text-tertiary">
              <span>💡 Showing {topPredictions.length} most popular active predictions</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-tertiary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bet Modal */}
      {selectedPrediction && (
        <BetModal
          prediction={selectedPrediction}
          isOpen={showBetModal}
          onClose={handleBetModalClose}
          mode="full"
          onBetPlaced={handleBetPlaced}
        />
      )}
    </>
  );
}
