// apps/client/src/components/pong/LobbyEloPreview.tsx
// -----------------------------------------------------------------------------
// Compact Elo impact preview showing both players' expected changes
// Single-section design optimized for 400px sidebar
// Updates live when wager changes during negotiation
// -----------------------------------------------------------------------------

import { useMemo } from 'react';
import { ClientEloCalculator } from '../../utils/eloCalculations';

interface Player {
  id: number;
  name: string;
  elo: number;
}

interface LobbyEloPreviewProps {
  player1: Player;
  player2: Player;
  currentWager: number;
  playerSlot: 0 | 1; // Which player is viewing
  className?: string;
}

export default function LobbyEloPreview({
  player1,
  player2,
  currentWager,
  playerSlot,
  className,
}: LobbyEloPreviewProps) {
  const isPlayer1 = playerSlot === 0;
  const myElo = isPlayer1 ? player1.elo : player2.elo;
  const opponentElo = isPlayer1 ? player2.elo : player1.elo;
  const myName = isPlayer1 ? player1.name : player2.name;
  const opponentName = isPlayer1 ? player2.name : player1.name;

  // Calculate Elo changes for both players
  const myPrediction = useMemo(() => {
    if (currentWager <= 0) return null;
    return ClientEloCalculator.predictEloChange(myElo, opponentElo, currentWager);
  }, [myElo, opponentElo, currentWager]);

  const opponentPrediction = useMemo(() => {
    if (currentWager <= 0) return null;
    return ClientEloCalculator.predictEloChange(opponentElo, myElo, currentWager);
  }, [opponentElo, myElo, currentWager]);

  // Determine matchup type
  const eloDiff = Math.abs(myElo - opponentElo);
  const matchupType = eloDiff < 50 ? 'even' : myElo > opponentElo ? 'favored' : 'underdog';

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
    <div
      className={`bg-surface border border-border rounded-lg overflow-hidden ${className || ''}`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-accent/10 border-b border-border">
        <h3 className="text-lg font-semibold text-content">Elo Impact Preview</h3>
        <p className="text-xs text-tertiary mt-0.5">
          Expected Elo changes for{' '}
          {currentWager > 0 ? `${currentWager.toLocaleString()} 🪙` : 'FREE'} match
        </p>
      </div>

      {/* Matchup Summary */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium text-info">You ({myName})</span>
          <span className="font-medium text-warning">Opponent ({opponentName})</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-lg font-bold mb-2">
          <span className="text-info">{myElo} Elo</span>
          <span className="text-tertiary text-sm">vs</span>
          <span className="text-warning">{opponentElo} Elo</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="text-tertiary">
            {matchupType === 'even' && '🤝 Even Match'}
            {matchupType === 'favored' && '⚔️ You are Favored'}
            {matchupType === 'underdog' && '⚡ Upset Opportunity'}
          </span>
          {myPrediction && (
            <span className={`${getConfidenceColor(myPrediction.confidenceLevel)}`}>
              • {getConfidenceText(myPrediction.confidenceLevel)}
            </span>
          )}
        </div>
      </div>

      {/* Elo Changes Grid */}
      {myPrediction && opponentPrediction ? (
        <div className="p-4 space-y-4">
          {/* Your Elo Changes */}
          <div>
            <div className="text-xs font-medium text-info mb-2">Your Elo Change</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-success/10 border border-success/20 rounded-lg p-2">
                <div className="text-xs text-success mb-1">If You Win</div>
                <div className="text-xl font-bold text-success">+{myPrediction.winChange}</div>
                <div className="text-xs text-success/70 mt-1">
                  Skill: +{myPrediction.skillComponent.win}
                  <br />
                  Economy: +{myPrediction.economyComponent.win}
                </div>
              </div>
              <div className="bg-error/10 border border-error/20 rounded-lg p-2">
                <div className="text-xs text-error mb-1">If You Lose</div>
                <div className="text-xl font-bold text-error">{myPrediction.lossChange}</div>
                <div className="text-xs text-error/70 mt-1">
                  Skill: {myPrediction.skillComponent.loss}
                  <br />
                  Economy: {myPrediction.economyComponent.loss}
                </div>
              </div>
            </div>
          </div>

          {/* Opponent Elo Changes */}
          <div>
            <div className="text-xs font-medium text-warning mb-2">Opponent Elo Change</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-success/10 border border-success/20 rounded-lg p-2">
                <div className="text-xs text-success mb-1">If They Win</div>
                <div className="text-xl font-bold text-success">
                  +{opponentPrediction.winChange}
                </div>
                <div className="text-xs text-success/70 mt-1">
                  Skill: +{opponentPrediction.skillComponent.win}
                  <br />
                  Economy: +{opponentPrediction.economyComponent.win}
                </div>
              </div>
              <div className="bg-error/10 border border-error/20 rounded-lg p-2">
                <div className="text-xs text-error mb-1">If They Lose</div>
                <div className="text-xl font-bold text-error">{opponentPrediction.lossChange}</div>
                <div className="text-xs text-error/70 mt-1">
                  Skill: {opponentPrediction.skillComponent.loss}
                  <br />
                  Economy: {opponentPrediction.economyComponent.loss}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center">
          <p className="text-sm text-tertiary">Set a wager to see Elo predictions</p>
        </div>
      )}
    </div>
  );
}
