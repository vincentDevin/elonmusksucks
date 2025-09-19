import { useState, useEffect, useMemo } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { ClientEloCalculator } from '../../utils/eloCalculations';

interface EloPredictionCardProps {
  wagerAmount: number;
  opponentType: 'ai' | 'pvp';
  aiDifficulty?: string;
  opponentElo?: number;
  playerElo?: number; // Allow passing player Elo directly
  className?: string;
  onWagerLocked?: (isLocked: boolean, wager: number) => void;
  autoLock?: boolean; // Auto-lock when wager is set
}

interface EloPredictionResult {
  winChange: number;
  lossChange: number;
  skillComponent: {
    win: number;
    loss: number;
  };
  economyComponent: {
    win: number;
    loss: number;
  };
  confidenceLevel: 'high' | 'medium' | 'low';
}

export default function EloPredictionCard({
  wagerAmount,
  opponentType,
  aiDifficulty = 'medium',
  opponentElo,
  playerElo: propPlayerElo,
  className = '',
  onWagerLocked,
  autoLock = false,
}: EloPredictionCardProps) {
  const [playerElo, setPlayerElo] = useState<number>(propPlayerElo || 1200);
  const [isWagerLocked, setIsWagerLocked] = useState(false);
  const [lockedWager, setLockedWager] = useState(0);
  const [serverPrediction, setServerPrediction] = useState<EloPredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current player Elo only if not provided as prop
  useEffect(() => {
    if (propPlayerElo) {
      setPlayerElo(propPlayerElo);
      return;
    }

    const fetchPlayerElo = async () => {
      try {
        const response = await api.get('/api/users/me/pong-stats');
        setPlayerElo(response.data.eloRating || 1200);
      } catch (err) {
        // Use default Elo if fetch fails
        setPlayerElo(1200);
      }
    };

    fetchPlayerElo();
  }, [propPlayerElo]);

  // Use client-side calculation for immediate feedback
  const clientPrediction = useMemo(() => {
    if (wagerAmount <= 0) return null;

    let effectiveOpponentElo = opponentElo;
    if (opponentType === 'ai') {
      effectiveOpponentElo = ClientEloCalculator.getAiElo(aiDifficulty);
    } else if (!effectiveOpponentElo) {
      effectiveOpponentElo = 1400; // Default PVP opponent Elo
    }

    return ClientEloCalculator.predictEloChange(playerElo, effectiveOpponentElo, wagerAmount);
  }, [playerElo, opponentElo, opponentType, aiDifficulty, wagerAmount]);

  // Handle wager locking
  const handleLockWager = async () => {
    if (isWagerLocked) {
      // Unlock
      setIsWagerLocked(false);
      setLockedWager(0);
      setServerPrediction(null);
      onWagerLocked?.(false, 0);
    } else {
      // Lock and optionally fetch server prediction for validation
      setIsWagerLocked(true);
      setLockedWager(wagerAmount);
      onWagerLocked?.(true, wagerAmount);

      // Optional: Fetch server prediction for comparison/validation
      if (wagerAmount > 0) {
        setLoading(true);
        setError(null);
        try {
          let effectiveOpponentElo = opponentElo;
          if (opponentType === 'ai') {
            effectiveOpponentElo = ClientEloCalculator.getAiElo(aiDifficulty);
          } else if (!effectiveOpponentElo) {
            effectiveOpponentElo = 1400;
          }

          const response = await api.get(
            `/api/pong/predict-elo?playerElo=${playerElo}&opponentElo=${effectiveOpponentElo}&wagerAmount=${wagerAmount}`,
          );
          setServerPrediction(response.data);
        } catch (err) {
          // Use client prediction as fallback
          console.error('Failed to fetch server prediction:', err);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // Auto-lock if enabled
  useEffect(() => {
    if (autoLock && wagerAmount > 0 && !isWagerLocked) {
      handleLockWager();
    }
  }, [autoLock, wagerAmount]);

  // Use server prediction if available, otherwise use client prediction
  const prediction = serverPrediction || clientPrediction;

  if (wagerAmount === 0) {
    return (
      <div className={`bg-surface border border-accent/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-info">
          <InformationCircleIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Free Practice Mode</span>
        </div>
        <p className="text-xs text-tertiary mt-1">
          This is a free match - no Elo changes or MuskBucks at stake. Perfect for practice!
        </p>
      </div>
    );
  }

  // Show lock button for wagers
  const showLockButton = wagerAmount > 0 && !autoLock;

  if (loading && !clientPrediction) {
    return (
      <div className={`bg-surface border border-accent/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm text-tertiary">Calculating Elo changes...</span>
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className={`bg-surface border border-error/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-error">
          <InformationCircleIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Prediction Unavailable</span>
        </div>
        <p className="text-xs text-tertiary mt-1">{error || 'Unable to calculate Elo changes'}</p>
      </div>
    );
  }

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-error';
      default:
        return 'text-tertiary';
    }
  };

  const getConfidenceText = (level: string) => {
    switch (level) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`bg-surface border border-accent/20 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrophyIcon className="w-5 h-5 text-primary" />
          <span className="font-medium text-content text-sm">
            Elo Impact Preview{' '}
            {isWagerLocked && <span className="text-xs text-success">(Locked)</span>}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {showLockButton && (
            <button
              onClick={handleLockWager}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                isWagerLocked
                  ? 'bg-success/20 text-success hover:bg-success/30'
                  : 'bg-accent/20 text-accent hover:bg-accent/30'
              }`}
            >
              {isWagerLocked ? (
                <>
                  <LockClosedIcon className="w-3 h-3" />
                  <span>Unlock</span>
                </>
              ) : (
                <>
                  <LockOpenIcon className="w-3 h-3" />
                  <span>Lock Wager</span>
                </>
              )}
            </button>
          )}
          <div className={`text-xs font-medium ${getConfidenceColor(prediction.confidenceLevel)}`}>
            {getConfidenceText(prediction.confidenceLevel)}
          </div>
        </div>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center text-xs">
        <div>
          <div className="text-tertiary">Your Elo</div>
          <div className="font-bold text-primary">{playerElo}</div>
        </div>
        <div>
          <div className="text-tertiary">Opponent</div>
          <div className="font-bold text-content">
            {opponentType === 'ai' ? `AI (${aiDifficulty})` : opponentElo ? opponentElo : 'Unknown'}
          </div>
        </div>
        <div>
          <div className="text-tertiary">Wager</div>
          <div className="font-bold text-accent">
            {isWagerLocked ? lockedWager : wagerAmount}
            {isWagerLocked && ' 🔒'}
          </div>
        </div>
      </div>

      {/* Prediction Results */}
      <div className="grid grid-cols-2 gap-3">
        {/* Win Scenario */}
        <div className="bg-success/10 border border-success/20 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <ArrowTrendingUpIcon className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">If You Win</span>
          </div>
          <div className="text-lg font-bold text-success mb-1">+{prediction.winChange} Elo</div>
          <div className="text-xs text-success space-y-1">
            <div>Skill: +{prediction.skillComponent.win}</div>
            <div>Economy: +{prediction.economyComponent.win}</div>
          </div>
        </div>

        {/* Loss Scenario */}
        <div className="bg-error/10 border border-error/20 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <ArrowTrendingDownIcon className="w-4 h-4 text-error" />
            <span className="text-sm font-medium text-error">If You Lose</span>
          </div>
          <div className="text-lg font-bold text-error mb-1">{prediction.lossChange} Elo</div>
          <div className="text-xs text-error space-y-1">
            <div>Skill: {prediction.skillComponent.loss}</div>
            <div>Economy: {prediction.economyComponent.loss}</div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-3 pt-3 border-t border-accent/20">
        <div className="text-xs text-tertiary text-center">
          💡 Elo changes are based on skill difference and wager size
        </div>
        {!isWagerLocked && showLockButton && (
          <div className="text-xs text-info text-center mt-1">
            🔐 Lock your wager to confirm the match stakes
          </div>
        )}
        {opponentType === 'pvp' && !opponentElo && (
          <div className="text-xs text-warning text-center mt-1">
            ⚠️ Opponent Elo unknown - using estimated values
          </div>
        )}
        {!serverPrediction && clientPrediction && (
          <div className="text-xs text-tertiary text-center mt-1">
            📊 Using client-side prediction
          </div>
        )}
      </div>
    </div>
  );
}
