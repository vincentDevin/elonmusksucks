import React, { useState } from 'react';

interface PredictionOption {
  id: number;
  label: string;
  odds: number;
  betCount?: number;
}

interface Prediction {
  id: number;
  title: string;
  description: string;
  category: string;
  options?: PredictionOption[];
  createdAt: string;
  expiresAt: string;
}

interface ResolvePredictionModalProps {
  prediction: Prediction;
  onResolve: (winningOptionId: number) => Promise<void>;
  onClose: () => void;
  isResolving?: boolean;
}

const ResolvePredictionModal: React.FC<ResolvePredictionModalProps> = ({
  prediction,
  onResolve,
  onClose,
  isResolving = false,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResolve = async () => {
    if (!selectedOptionId) return;

    setIsSubmitting(true);
    try {
      await onResolve(selectedOptionId);
      onClose();
    } catch (error) {
      console.error('Failed to resolve prediction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">Resolve Prediction</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-content transition-colors text-xl"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        {/* Prediction Details */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-content mb-2">{prediction.title}</h3>
          <p className="text-muted mb-4">{prediction.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span>
              Category: <span className="text-content">{prediction.category}</span>
            </span>
            <span>
              Created:{' '}
              <span className="text-content">
                {new Date(prediction.createdAt).toLocaleDateString()}
              </span>
            </span>
            <span>
              Expires:{' '}
              <span className="text-content">
                {new Date(prediction.expiresAt).toLocaleDateString()}
              </span>
            </span>
          </div>
        </div>

        {/* Options Selection */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-content mb-4">Select the winning option:</h4>
          {!prediction.options || prediction.options.length === 0 ? (
            <div className="text-error p-4 bg-error bg-opacity-10 border border-error rounded-lg">
              Error: No options available for this prediction. Cannot resolve.
            </div>
          ) : (
            <div className="space-y-3">
              {prediction.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedOptionId === option.id
                      ? 'border-primary bg-primary bg-opacity-10'
                      : 'border-muted hover:border-primary hover:bg-primary hover:bg-opacity-5'
                  }`}
                >
                  <input
                    type="radio"
                    name="winningOption"
                    value={option.id}
                    checked={selectedOptionId === option.id}
                    onChange={() => setSelectedOptionId(option.id)}
                    className="sr-only"
                  />

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-content">{option.label}</span>
                      <div className="text-right">
                        <div className="text-sm text-muted">Odds: {option.odds.toFixed(2)}x</div>
                        {option.betCount && (
                          <div className="text-xs text-muted">{option.betCount} bets</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`ml-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOptionId === option.id ? 'border-primary bg-primary' : 'border-muted'
                    }`}
                  >
                    {selectedOptionId === option.id && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-warning bg-opacity-10 border border-warning rounded-lg">
          <p className="text-warning font-medium mb-2">⚠️ Warning: This action cannot be undone</p>
          <p className="text-warning text-sm">
            Resolving this prediction will immediately settle all bets and distribute payouts. Make
            sure you have selected the correct winning option.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted hover:text-content transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={!selectedOptionId || isSubmitting || isResolving}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedOptionId && !isSubmitting && !isResolving
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {isSubmitting || isResolving ? 'Resolving...' : 'Resolve Prediction'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResolvePredictionModal;
