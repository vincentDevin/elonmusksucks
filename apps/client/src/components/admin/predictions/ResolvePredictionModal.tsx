import React, { useState } from 'react';
import BaseModal from '../../BaseModal';

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
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Resolve Prediction"
      icon="⚖️"
      size="lg"
      variant="warning"
      actions={[
        {
          label: 'Cancel',
          onClick: onClose,
          variant: 'secondary',
          disabled: isSubmitting,
        },
        {
          label: isSubmitting || isResolving ? 'Resolving...' : 'Resolve Prediction',
          onClick: handleResolve,
          variant: 'danger',
          disabled: !selectedOptionId || isSubmitting || isResolving,
          loading: isSubmitting || isResolving,
        },
      ]}
    >
      {/* Prediction Details */}
      <div className="mb-6 p-4 bg-surface rounded-lg border border-muted">
        <h3 className="text-lg font-semibold text-content mb-2">{prediction.title}</h3>
        <p className="text-tertiary mb-4 line-clamp-3">{prediction.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-tertiary">Category:</span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-secondary/20 text-secondary rounded-full">
              {prediction.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-tertiary">Created:</span>
            <span className="text-content font-medium">
              {new Date(prediction.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-tertiary">Expires:</span>
            <span className="text-content font-medium">
              {new Date(prediction.expiresAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Options Selection */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-content mb-4">Select the winning option:</h4>
        {!prediction.options || prediction.options.length === 0 ? (
          <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-error text-lg">❌</span>
              <div>
                <div className="font-medium text-error mb-1">No Options Available</div>
                <div className="text-sm text-content">
                  This prediction doesn't have any options to select from. Please add options before
                  resolving.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {prediction.options.map((option, index) => (
              <label
                key={option.id}
                className={`
                  group flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    selectedOptionId === option.id
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-muted hover:border-primary/50 hover:bg-surface/80'
                  }
                `}
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
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-tertiary bg-muted px-2 py-1 rounded">
                        Option {index + 1}
                      </span>
                      <span className="font-medium text-content group-hover:text-primary transition-colors">
                        {option.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-tertiary">Odds:</span>
                        <span className="font-medium text-content">{option.odds.toFixed(2)}x</span>
                      </div>
                      {option.betCount && (
                        <div className="flex items-center gap-1">
                          <span className="text-tertiary">Bets:</span>
                          <span className="font-medium text-content">{option.betCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`
                    ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${
                      selectedOptionId === option.id
                        ? 'border-primary bg-primary scale-110'
                        : 'border-muted group-hover:border-primary'
                    }
                  `}
                >
                  {selectedOptionId === option.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-warning text-lg flex-shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-warning font-semibold mb-2">Warning: This action cannot be undone</p>
            <p className="text-warning/80 text-sm leading-relaxed">
              Resolving this prediction will immediately settle all bets and distribute payouts.
              Make sure you have selected the correct winning option before proceeding.
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default ResolvePredictionModal;
