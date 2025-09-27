// apps/client/src/components/OptimisticBetForm.tsx
// Example component demonstrating optimistic betting with React 19
// Shows instant UI feedback with automatic rollback on errors

import React, { useState } from 'react';
import { useOptimisticBetting } from '../../hooks/useOptimisticBetting';

interface BetFormProps {
  predictionId: number;
  optionId: number;
  optionName: string;
  currentOdds: number;
  onSuccess?: () => void;
}

export function OptimisticBetForm({
  predictionId,
  optionId,
  optionName,
  currentOdds,
  onSuccess,
}: BetFormProps) {
  const [betAmount, setBetAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { balance, isBalanceUpdating, balanceError, placeBet, canPlaceBet, totalExposure } =
    useOptimisticBetting();

  const amount = parseFloat(betAmount) || 0;
  const potentialWinnings = amount * currentOdds;
  const isValidAmount = amount > 0 && canPlaceBet(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidAmount) return;

    setIsSubmitting(true);

    try {
      await placeBet({
        predictionId,
        optionId,
        amount,
        odds: currentOdds,
        potentialWinnings,
      });

      // Clear form on success
      setBetAmount('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Bet placement failed:', error);
      // Error is handled by the optimistic update system
      // Balance will automatically roll back
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface rounded-lg p-4 border border-muted">
      <h3 className="font-semibold text-content mb-3">Place Your Bet</h3>

      {/* Balance Display with Optimistic Updates */}
      <div className="mb-4 flex justify-between items-center">
        <span className="text-sm text-tertiary">Current Balance:</span>
        <div className="flex items-center space-x-2">
          <span className={`font-bold text-lg ${isBalanceUpdating ? 'animate-pulse' : ''}`}>
            {balance.toFixed(0)} 🪙
          </span>
          {isBalanceUpdating && <span className="text-xs text-primary animate-spin">⟳</span>}
        </div>
      </div>

      {/* Active Exposure */}
      {totalExposure > 0 && (
        <div className="mb-4 flex justify-between items-center">
          <span className="text-sm text-tertiary">Active Bets:</span>
          <span className="text-sm font-medium text-warning">{totalExposure.toFixed(0)} 🪙</span>
        </div>
      )}

      {/* Bet Details */}
      <div className="mb-4 p-3 bg-muted rounded">
        <div className="text-sm text-tertiary mb-1">Betting on:</div>
        <div className="font-medium text-content">{optionName}</div>
        <div className="text-sm text-primary mt-1">Odds: {currentOdds.toFixed(2)}x</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-content mb-1">Bet Amount</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className={`w-full px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
              amount > balance ? 'border-error' : 'border-muted'
            }`}
            placeholder="Enter amount..."
            min="0"
            step="1"
            disabled={isSubmitting || isBalanceUpdating}
          />

          {/* Validation Messages */}
          {amount > balance && <p className="text-xs text-error mt-1">Insufficient balance</p>}
          {amount > 0 && amount <= balance && (
            <p className="text-xs text-tertiary mt-1">
              Available: {(balance - totalExposure).toFixed(0)} 🪙
            </p>
          )}
        </div>

        {/* Potential Winnings */}
        {amount > 0 && (
          <div className="p-3 bg-success/10 border border-success/20 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm text-success">Potential Win:</span>
              <span className="font-bold text-success">+{potentialWinnings.toFixed(0)} 🪙</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-tertiary">Net Profit:</span>
              <span className="text-sm text-tertiary">
                +{(potentialWinnings - amount).toFixed(0)} 🪙
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {balanceError && (
          <div className="p-3 bg-error/10 border border-error/20 rounded">
            <p className="text-sm text-error">{balanceError.message || 'Failed to place bet'}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValidAmount || isSubmitting || isBalanceUpdating}
          className={`w-full py-2 px-4 rounded-md font-medium transition-all ${
            isValidAmount && !isSubmitting
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'bg-muted text-tertiary cursor-not-allowed'
          } ${isSubmitting ? 'animate-pulse' : ''}`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2">⟳</span>
              Placing Bet...
            </span>
          ) : isBalanceUpdating ? (
            'Updating Balance...'
          ) : (
            'Place Bet'
          )}
        </button>

        {/* Quick Bet Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[10, 25, 50, 100].map((quickAmount) => (
            <button
              key={quickAmount}
              type="button"
              onClick={() => setBetAmount(quickAmount.toString())}
              disabled={!canPlaceBet(quickAmount) || isSubmitting}
              className={`py-1 px-2 text-sm rounded transition-colors ${
                canPlaceBet(quickAmount)
                  ? 'bg-muted hover:bg-primary/20 text-content'
                  : 'bg-muted/50 text-tertiary/50 cursor-not-allowed'
              }`}
            >
              {quickAmount}
            </button>
          ))}
        </div>
      </form>

      {/* Optimistic Update Indicator */}
      {isBalanceUpdating && (
        <div className="mt-3 text-center">
          <p className="text-xs text-primary animate-pulse">
            ✨ Balance updated instantly - confirming with server...
          </p>
        </div>
      )}
    </div>
  );
}

export default OptimisticBetForm;
