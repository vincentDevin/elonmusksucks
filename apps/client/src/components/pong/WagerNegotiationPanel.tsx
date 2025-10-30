// apps/client/src/components/pong/WagerNegotiationPanel.tsx
// -----------------------------------------------------------------------------
// Wager negotiation panel for PVP pong matches
// Supports offer/counter flow with 5-round limit and 2-minute timeout
// Features: slider controls, acceptance states, negotiation history
// -----------------------------------------------------------------------------

import { useState } from 'react';
import type { WagerNegotiation } from '@ems/types';

interface WagerNegotiationPanelProps {
  negotiation: WagerNegotiation;
  playerSlot: 0 | 1;
  balance: number;
  timeRemaining: number | null; // in seconds
  onPropose: (amount: number) => void;
  onAccept: () => void;
  onReject: () => void;
  className?: string;
}

const formatMuskBucks = (amount: number): string => {
  return amount.toLocaleString();
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function WagerNegotiationPanel({
  negotiation,
  playerSlot,
  balance,
  timeRemaining,
  onPropose,
  onAccept,
  onReject,
  className,
}: WagerNegotiationPanelProps) {
  const [proposedAmount, setProposedAmount] = useState(negotiation.currentOffer);

  const isMyOffer = negotiation.proposedBy === playerSlot;
  const haveIAccepted = negotiation.acceptedBy.includes(playerSlot);
  const hasOpponentAccepted = negotiation.acceptedBy.includes(playerSlot === 0 ? 1 : 0);
  const bothAccepted = negotiation.acceptedBy.length === 2;
  const maxRoundsReached = negotiation.roundCount >= 5;
  const canPropose = !maxRoundsReached && balance >= proposedAmount;

  // Risk level calculation
  const getRiskLevel = (amount: number) => {
    if (amount === 0) return { level: 'FREE PLAY', bgColor: 'bg-gray-100', color: 'text-gray-800' };
    const percentage = (amount / balance) * 100;
    if (percentage < 5)
      return { level: 'Conservative', bgColor: 'bg-green-100', color: 'text-green-800' };
    if (percentage < 15)
      return { level: 'Moderate', bgColor: 'bg-blue-100', color: 'text-blue-800' };
    if (percentage < 35)
      return { level: 'Aggressive', bgColor: 'bg-yellow-100', color: 'text-yellow-800' };
    if (percentage < 60)
      return { level: 'High Roller', bgColor: 'bg-orange-100', color: 'text-orange-800' };
    return { level: 'YOLO', bgColor: 'bg-red-100', color: 'text-red-800' };
  };

  const riskLevel = getRiskLevel(proposedAmount);

  const handlePropose = () => {
    if (proposedAmount === negotiation.currentOffer) {
      alert('Please enter a different amount to counter-offer');
      return;
    }
    if (proposedAmount > balance) {
      alert('Insufficient balance for this wager');
      return;
    }
    if (proposedAmount < 0) {
      alert('Wager must be non-negative');
      return;
    }
    onPropose(proposedAmount);
  };

  return (
    <div
      className={`flex flex-col bg-surface border border-border rounded-lg overflow-hidden ${className || ''}`}
    >
      {/* Header with countdown */}
      <div className="flex items-center justify-between px-4 py-3 bg-accent/10 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Wager Negotiation</span>
          <span className="text-xs text-tertiary">Round {negotiation.roundCount}/5</span>
        </div>
        {timeRemaining !== null && (
          <div
            className={`text-sm font-bold ${
              timeRemaining < 30 ? 'text-error animate-pulse' : 'text-warning'
            }`}
          >
            ⏱️ {formatTime(timeRemaining)}
          </div>
        )}
      </div>

      {/* Current offer status */}
      <div className="px-4 py-4 space-y-3">
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
          <div className="text-xs text-tertiary mb-1">Current Offer</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-content">
              {formatMuskBucks(negotiation.currentOffer)}
            </span>
            <span className="text-xl">🪙</span>
            <span className="text-xs text-tertiary ml-auto">
              by {isMyOffer ? 'You' : 'Opponent'}
            </span>
          </div>
        </div>

        {/* Acceptance status */}
        <div className="flex gap-2">
          <div
            className={`flex-1 px-3 py-2 rounded border text-xs font-medium text-center ${
              haveIAccepted
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'bg-muted/20 border-muted text-tertiary'
            }`}
          >
            {haveIAccepted ? '✓ You Accepted' : 'You: Pending'}
          </div>
          <div
            className={`flex-1 px-3 py-2 rounded border text-xs font-medium text-center ${
              hasOpponentAccepted
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'bg-muted/20 border-muted text-tertiary'
            }`}
          >
            {hasOpponentAccepted ? '✓ Opponent Accepted' : 'Opponent: Pending'}
          </div>
        </div>

        {/* Action buttons */}
        {!bothAccepted && (
          <div className="space-y-2">
            {!haveIAccepted && (
              <div className="flex gap-2">
                <button
                  onClick={onAccept}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                >
                  Accept {formatMuskBucks(negotiation.currentOffer)} 🪙
                </button>
                <button
                  onClick={onReject}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                >
                  Reject
                </button>
              </div>
            )}

            {haveIAccepted && (
              <div className="bg-info/10 border border-info/20 rounded p-2 text-xs text-info text-center">
                Waiting for opponent to accept...
              </div>
            )}
          </div>
        )}

        {bothAccepted && (
          <div className="bg-success/10 border border-success/20 rounded p-3 text-center">
            <div className="text-sm font-bold text-success">🎉 Wager Locked!</div>
            <div className="text-xs text-tertiary mt-1">
              Final wager: {formatMuskBucks(negotiation.currentOffer)} 🪙 per player
            </div>
          </div>
        )}
      </div>

      {/* Counter-offer section */}
      {!bothAccepted && (
        <div className="px-4 py-3 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-content">Make Counter-Offer</h4>
            <span className="text-xs text-tertiary">Balance: {formatMuskBucks(balance)} 🪙</span>
          </div>

          {maxRoundsReached && (
            <div className="bg-warning/10 border border-warning/20 rounded p-2">
              <div className="flex items-center text-xs text-warning">
                <span className="mr-1">⚠️</span>
                Max 5 rounds reached. Accept or wait for timeout.
              </div>
            </div>
          )}

          {/* Amount input with risk level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-tertiary">Amount</span>
              {proposedAmount > 0 && (
                <div
                  className={`px-1.5 py-0.5 rounded text-xs font-medium ${riskLevel.bgColor} ${riskLevel.color}`}
                >
                  {riskLevel.level}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={proposedAmount}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(balance, parseInt(e.target.value) || 0));
                  setProposedAmount(value);
                }}
                min="0"
                max={balance}
                step="50"
                disabled={maxRoundsReached}
                className="w-32 px-3 py-2 bg-background border border-muted rounded text-right font-bold text-content focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
              />
              <span className="font-bold text-content">🪙</span>
            </div>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max={balance}
              step="50"
              value={proposedAmount}
              onChange={(e) => setProposedAmount(parseInt(e.target.value))}
              disabled={maxRoundsReached}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(proposedAmount / balance) * 100}%, var(--color-muted) ${(proposedAmount / balance) * 100}%, var(--color-muted) 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-tertiary mt-1">
              <span>0</span>
              <span className="text-accent font-medium">{formatMuskBucks(proposedAmount)}</span>
              <span>{formatMuskBucks(balance)}</span>
            </div>
          </div>

          {/* Quick amount buttons */}
          <div className="grid grid-cols-4 gap-1">
            {[100, 500, 1000, 2500].map((amount) => {
              const isDisabled = amount > balance || maxRoundsReached;
              return (
                <button
                  key={amount}
                  onClick={() => setProposedAmount(Math.min(amount, balance))}
                  disabled={isDisabled}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    isDisabled
                      ? 'opacity-60 cursor-not-allowed bg-muted/20 text-tertiary'
                      : proposedAmount === amount
                        ? 'bg-accent text-white'
                        : 'bg-muted/20 text-content hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/50 cursor-pointer'
                  }`}
                >
                  {formatMuskBucks(amount)}
                </button>
              );
            })}
          </div>

          {/* Propose button */}
          <button
            onClick={handlePropose}
            disabled={!canPropose || proposedAmount === negotiation.currentOffer}
            className="w-full px-4 py-2 bg-primary text-primary-contrast rounded-lg text-sm font-semibold hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {maxRoundsReached
              ? 'Max Rounds Reached'
              : proposedAmount === negotiation.currentOffer
                ? 'Enter Different Amount'
                : `Propose ${formatMuskBucks(proposedAmount)} 🪙`}
          </button>
        </div>
      )}

      {/* Negotiation history */}
      {negotiation.history && negotiation.history.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <h4 className="text-xs font-semibold text-tertiary mb-2">Negotiation History</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {negotiation.history
              .slice()
              .reverse()
              .slice(0, 3)
              .map((entry, index) => (
                <div
                  key={`history-${entry.timestamp}-${index}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-tertiary">
                    {entry.proposedBy === playerSlot ? 'You' : 'Opponent'} offered
                  </span>
                  <span className="font-medium text-content">
                    {formatMuskBucks(entry.amount)} 🪙
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
