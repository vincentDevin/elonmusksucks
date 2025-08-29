import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';

interface EloPredictionCardProps {
  wagerAmount: number;
  opponentType: 'ai' | 'pvp';
  aiDifficulty?: string;
  opponentElo?: number;
  playerElo?: number; // Allow passing player Elo directly
  className?: string;
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
}: EloPredictionCardProps) {
  const [prediction, setPrediction] = useState<EloPredictionResult | null>(null);
  const [playerElo, setPlayerElo] = useState<number>(propPlayerElo || 1200);
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

  // Fetch Elo prediction when parameters change
  useEffect(() => {
    if (wagerAmount < 0) return;

    const fetchPrediction = async () => {
      setLoading(true);
      setError(null);
      try {
        // Determine opponent Elo based on type
        let effectiveOpponentElo = opponentElo;
        if (opponentType === 'ai') {
          const aiEloMap = {
            easy: 800,
            medium: 1200,
            hard: 1600,
            impossible: 2200,
          };
          effectiveOpponentElo = aiEloMap[aiDifficulty as keyof typeof aiEloMap] || 1200;
        } else if (!effectiveOpponentElo) {
          // For PVP without known opponent, use average Elo
          effectiveOpponentElo = 1400;
        }

        const response = await api.get(
          `/api/pong/predict-elo?playerElo=${playerElo}&opponentElo=${effectiveOpponentElo}&wagerAmount=${wagerAmount}`,
        );

        const data = response.data;
        setPrediction(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to predict Elo changes');
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [wagerAmount, opponentType, aiDifficulty, opponentElo, playerElo]);

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

  if (loading) {
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
          <span className="font-medium text-content text-sm">Elo Impact Preview</span>
        </div>
        <div className={`text-xs font-medium ${getConfidenceColor(prediction.confidenceLevel)}`}>
          {getConfidenceText(prediction.confidenceLevel)}
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
          <div className="font-bold text-accent">{wagerAmount}</div>
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
        {opponentType === 'pvp' && !opponentElo && (
          <div className="text-xs text-warning text-center mt-1">
            ⚠️ Opponent Elo unknown - using estimated values
          </div>
        )}
      </div>
    </div>
  );
}
